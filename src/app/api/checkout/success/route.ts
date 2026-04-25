import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ path: "/api/checkout/success" });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const intentId = searchParams.get("intentId");
    const orderId = searchParams.get("orderId");
    const tenantId = searchParams.get("tenantId");
    const error = searchParams.get("error");

    let intent = null;
    if (intentId) {
      intent = await prisma.paymentIntent.findUnique({
        where: { id: intentId },
      });
    } else if (orderId) {
      const where = tenantId
        ? { providerRef: orderId, tenantId }
        : { providerRef: orderId };
      intent = await prisma.paymentIntent.findFirst({ where });
    }

    if (!intent) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    let storefrontSlug: string | null = null;
    if (intent.cartId) {
      const cart = await prisma.cart.findUnique({
        where: { id: intent.cartId },
        select: { tenantId: true },
      });
      if (cart) {
        const sf = await prisma.storefrontConfig.findFirst({
          where: { tenantId: cart.tenantId },
          select: { slug: true },
        });
        storefrontSlug = sf?.slug ?? null;
      }
    }

    return NextResponse.json({
      ok: !error && intent.status === "succeeded",
      intent: {
        id: intent.id,
        providerRef: intent.providerRef,
        status: intent.status,
        provider: intent.provider,
        amountCents: intent.amountCents,
        currency: intent.currency,
        customerEmail: intent.customerEmail,
        customerName: intent.customerName,
        paidAt: intent.paidAt,
      },
      storefrontSlug,
    });
  } catch (err) {
    log.error({ err }, "Success lookup failed");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
