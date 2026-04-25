import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPaymentConfig, verifyStripeWebhook } from "@/lib/payments";
import { handlePaymentSucceeded } from "@/lib/payments/post-payment";

const log = logger.child({ path: "/api/checkout/pay/stripe/webhook" });

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event: StripeEvent | null = null;
  let tenantId: string | null = null;

  try {
    // Stripe sends events without identifying tenant in headers; we need to parse
    // the event first to find the related PaymentIntent and resolve the tenant.
    const parsed = JSON.parse(payload) as StripeEvent;
    const obj = parsed.data?.object as Record<string, unknown> | undefined;
    const intentId = obj?.id as string | undefined;

    let local = null;
    if (parsed.type?.startsWith("payment_intent.") && intentId) {
      local = await prisma.paymentIntent.findFirst({
        where: { provider: "stripe", providerRef: intentId },
      });
    } else if (parsed.type?.startsWith("charge.") && obj?.payment_intent) {
      local = await prisma.paymentIntent.findFirst({
        where: { provider: "stripe", providerRef: obj.payment_intent as string },
      });
    }

    if (!local) {
      log.warn({ type: parsed.type }, "Stripe webhook: intent not matched");
      return NextResponse.json({ received: true });
    }

    tenantId = local.tenantId;
    const config = await getPaymentConfig(tenantId);
    if (!config?.stripe?.webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const verification = verifyStripeWebhook(
      config.stripe.webhookSecret,
      payload,
      signature
    );
    if (!verification.valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    event = verification.event as StripeEvent;

    if (event.type === "payment_intent.succeeded") {
      if (local.status !== "succeeded") {
        await prisma.paymentIntent.update({
          where: { id: local.id },
          data: { status: "succeeded", paidAt: new Date() },
        });
        await handlePaymentSucceeded(local.id);
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const errMessage =
        ((event.data.object as Record<string, unknown>).last_payment_error as
          | { message?: string }
          | undefined)?.message ?? "Payment failed";
      await prisma.paymentIntent.update({
        where: { id: local.id },
        data: {
          status: "failed",
          failedAt: new Date(),
          errorMessage: errMessage,
        },
      });
    } else if (event.type === "charge.refunded") {
      await prisma.paymentIntent.update({
        where: { id: local.id },
        data: { status: "refunded", refundedAt: new Date() },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error({ error, tenantId }, "Stripe webhook processing failed");
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
