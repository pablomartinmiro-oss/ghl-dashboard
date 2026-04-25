import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createPayment, getPaymentConfig } from "@/lib/payments";

const log = logger.child({ path: "/api/checkout/pay" });

const schema = z.object({
  sessionToken: z.string().min(1),
  provider: z.enum(["redsys", "stripe"]),
  customerEmail: z.string().email(),
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().max(40).nullable().optional(),
  paymentType: z.enum(["full", "deposit"]).default("full"),
});

function getBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const cart = await prisma.cart.findUnique({
      where: { sessionToken: data.sessionToken },
    });
    if (!cart) {
      return NextResponse.json({ error: "Carrito no encontrado" }, { status: 404 });
    }
    if (cart.totalCents <= 0) {
      return NextResponse.json({ error: "Carrito vacio" }, { status: 400 });
    }

    const config = await getPaymentConfig(cart.tenantId);
    if (!config) {
      return NextResponse.json({ error: "Pagos no configurados" }, { status: 400 });
    }

    let amountCents = cart.totalCents;
    if (data.paymentType === "deposit" && config.allowPartialPayments && config.depositPct) {
      amountCents = Math.max(100, Math.round((cart.totalCents * config.depositPct) / 100));
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        customerPhone: data.customerPhone ?? cart.customerPhone,
      },
    });

    const description = `Reserva ${cart.id.slice(-6).toUpperCase()}`;
    const result = await createPayment({
      tenantId: cart.tenantId,
      provider: data.provider,
      amountCents,
      currency: "EUR",
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      description,
      cartId: cart.id,
      callbackBaseUrl: getBaseUrl(req),
      metadata: { paymentType: data.paymentType },
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error({ error }, "Pay initiation failed");
    const message = error instanceof Error ? error.message : "Error al iniciar el pago";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
