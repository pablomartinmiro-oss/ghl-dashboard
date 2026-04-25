import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { processRefund } from "@/lib/payments";

const log = logger.child({ path: "/api/checkout/payments/[id]" });

const refundSchema = z.object({
  action: z.literal("refund"),
  amountCents: z.number().int().positive().optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const payment = await prisma.paymentIntent.findFirst({
    where: { id, tenantId },
  });
  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  const cart = payment.cartId
    ? await prisma.cart.findUnique({ where: { id: payment.cartId } })
    : null;

  return NextResponse.json({ payment, cart });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await processRefund(tenantId, id, parsed.data.amountCents);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const payment = await prisma.paymentIntent.findFirst({
      where: { id, tenantId },
    });
    log.info({ id, tenantId }, "Refund processed");
    return NextResponse.json({ payment });
  } catch (error) {
    log.error({ error, id }, "Refund failed");
    return NextResponse.json({ error: "Error al reembolsar" }, { status: 500 });
  }
}
