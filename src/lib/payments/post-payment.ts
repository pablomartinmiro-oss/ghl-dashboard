import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { triggerBookingConfirmed } from "@/lib/ghl/workflows";
import { enrichContactOnBooking } from "@/lib/ghl/contact-enrichment";
import type { CartItem } from "./cart";

const log = logger.child({ module: "post-payment" });

/**
 * Run side-effects after a payment succeeds.
 * Each step is best-effort — failures are logged, not propagated.
 */
export async function handlePaymentSucceeded(paymentIntentId: string) {
  const intent = await prisma.paymentIntent.findUnique({
    where: { id: paymentIntentId },
  });
  if (!intent || intent.status !== "succeeded") return;

  const tenantId = intent.tenantId;

  // 1. Confirm booking request (if any)
  if (intent.bookingRequestId) {
    try {
      await prisma.bookingRequest.update({
        where: { id: intent.bookingRequestId },
        data: { status: "confirmed", totalCents: intent.amountCents },
      });
    } catch (error) {
      log.warn({ error, bookingId: intent.bookingRequestId }, "Failed to confirm booking");
    }
  }

  // 2. Accounting transaction
  try {
    await prisma.transaction.create({
      data: {
        tenantId,
        type: "income",
        category: intent.bookingRequestId ? "reservation" : "quote",
        description: `Pago checkout — ${intent.customerName}`,
        amountCents: intent.amountCents,
        currency: intent.currency,
        date: intent.paidAt ?? new Date(),
        referenceType: "payment_intent",
        referenceId: intent.id,
        paymentMethod: intent.provider === "stripe" ? "card" : intent.provider,
        status: "confirmed",
      },
    });
  } catch (error) {
    log.warn({ error }, "Failed to create transaction");
  }

  // 3. Inventory reservations (best-effort)
  if (intent.cartId) {
    const cart = await prisma.cart.findUnique({ where: { id: intent.cartId } });
    if (cart) {
      const items = cart.items as CartItem[];
      for (const item of items) {
        if (!item.startDate || !item.endDate) continue;
        try {
          await prisma.inventoryReservation.create({
            data: {
              tenantId,
              itemId: item.productId,
              customerName: cart.customerName ?? intent.customerName,
              customerEmail: cart.customerEmail ?? intent.customerEmail,
              startDate: new Date(item.startDate),
              endDate: new Date(item.endDate),
              status: "reserved",
            },
          });
        } catch {
          // Item may not be an inventory item — silently skip.
        }
      }
    }
  }

  // 4. GHL enrichment (best-effort, requires contact id from cached contacts by email)
  try {
    const contact = await prisma.cachedContact.findFirst({
      where: { tenantId, email: intent.customerEmail },
      select: { id: true },
    });
    if (contact) {
      await enrichContactOnBooking(tenantId, contact.id, {
        destination: "checkout",
        totalCents: intent.amountCents,
        date: intent.paidAt ?? new Date(),
      });
      await triggerBookingConfirmed(tenantId, contact.id, {
        destination: "checkout",
        dates: (intent.paidAt ?? new Date()).toISOString().split("T")[0],
        amount: (intent.amountCents / 100).toFixed(2),
      });
    }
  } catch (error) {
    log.warn({ error }, "GHL post-payment integration failed");
  }
}
