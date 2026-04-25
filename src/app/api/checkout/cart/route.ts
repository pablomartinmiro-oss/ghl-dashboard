import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  calculateTotals,
  generateCartToken,
  loadCartByToken,
  newExpiry,
  resolvePromoCode,
  serialize,
  type CartItem,
} from "@/lib/payments/cart";

const log = logger.child({ path: "/api/checkout/cart" });

const itemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(99),
  priceCents: z.number().int().min(0),
  destinationId: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

const createSchema = z.object({
  storefrontSlug: z.string().min(1),
  items: z.array(itemSchema).min(1).max(50),
  customerEmail: z.string().email().nullable().optional(),
  customerName: z.string().max(120).nullable().optional(),
  customerPhone: z.string().max(40).nullable().optional(),
  promoCode: z.string().max(40).nullable().optional(),
});

const updateSchema = z.object({
  sessionToken: z.string().min(1),
  items: z.array(itemSchema).optional(),
  customerEmail: z.string().email().nullable().optional(),
  customerName: z.string().max(120).nullable().optional(),
  customerPhone: z.string().max(40).nullable().optional(),
});

export async function GET(req: NextRequest) {
  const sessionToken = req.nextUrl.searchParams.get("token");
  if (!sessionToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const cart = await loadCartByToken(sessionToken);
  if (!cart) {
    return NextResponse.json({ error: "Cart not found" }, { status: 404 });
  }
  return NextResponse.json({ cart });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (typeof body?.sessionToken === "string") {
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Datos invalidos", details: parsed.error.issues },
          { status: 400 }
        );
      }
      const data = parsed.data;
      const existing = await prisma.cart.findUnique({
        where: { sessionToken: data.sessionToken },
      });
      if (!existing) {
        return NextResponse.json({ error: "Cart not found" }, { status: 404 });
      }

      const items = (data.items ?? (existing.items as unknown as CartItem[])) as CartItem[];
      const { subtotalCents, totalCents } = calculateTotals(items, existing.discountCents);

      const updated = await prisma.cart.update({
        where: { id: existing.id },
        data: {
          items: JSON.parse(JSON.stringify(items)),
          customerEmail:
            data.customerEmail !== undefined ? data.customerEmail : existing.customerEmail,
          customerName:
            data.customerName !== undefined ? data.customerName : existing.customerName,
          customerPhone:
            data.customerPhone !== undefined ? data.customerPhone : existing.customerPhone,
          subtotalCents,
          totalCents,
          expiresAt: newExpiry(),
        },
      });
      return NextResponse.json({ cart: serialize(updated) });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const config = await prisma.storefrontConfig.findUnique({
      where: { slug: data.storefrontSlug },
      select: { tenantId: true, enabled: true },
    });
    if (!config || !config.enabled) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }

    const items = data.items as CartItem[];
    const tentativeTotals = calculateTotals(items, 0);
    let discountCents = 0;
    let promoCode: string | null = null;

    if (data.promoCode) {
      const promo = await resolvePromoCode(
        config.tenantId,
        data.promoCode,
        tentativeTotals.subtotalCents
      );
      if (promo.ok && promo.discountCents !== undefined) {
        discountCents = promo.discountCents;
        promoCode = data.promoCode.trim().toUpperCase();
      }
    }

    const { subtotalCents, totalCents } = calculateTotals(items, discountCents);
    const sessionToken = generateCartToken();
    const cart = await prisma.cart.create({
      data: {
        tenantId: config.tenantId,
        sessionToken,
        items: JSON.parse(JSON.stringify(items)),
        customerEmail: data.customerEmail ?? null,
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone ?? null,
        promoCode,
        discountCents,
        subtotalCents,
        totalCents,
        expiresAt: newExpiry(),
      },
    });

    return NextResponse.json({ cart: serialize(cart) }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Cart create/update failed");
    return NextResponse.json({ error: "Error al guardar el carrito" }, { status: 500 });
  }
}
