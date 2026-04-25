import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  calculateTotals,
  resolvePromoCode,
  serialize,
  type CartItem,
} from "@/lib/payments/cart";

const log = logger.child({ path: "/api/checkout/cart/apply-promo" });

const schema = z.object({
  sessionToken: z.string().min(1),
  promoCode: z.string().min(1).max(40),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    }

    const cart = await prisma.cart.findUnique({
      where: { sessionToken: parsed.data.sessionToken },
    });
    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const items = cart.items as CartItem[];
    const { subtotalCents } = calculateTotals(items, 0);

    const result = await resolvePromoCode(
      cart.tenantId,
      parsed.data.promoCode,
      subtotalCents
    );
    if (!result.ok || result.discountCents === undefined) {
      return NextResponse.json({ error: result.error ?? "Codigo no valido" }, { status: 400 });
    }

    const totalCents = Math.max(0, subtotalCents - result.discountCents);
    const updated = await prisma.cart.update({
      where: { id: cart.id },
      data: {
        promoCode: parsed.data.promoCode.trim().toUpperCase(),
        discountCents: result.discountCents,
        subtotalCents,
        totalCents,
      },
    });

    return NextResponse.json({ cart: serialize(updated) });
  } catch (error) {
    log.error({ error }, "Apply promo failed");
    return NextResponse.json({ error: "Error al aplicar el codigo" }, { status: 500 });
  }
}
