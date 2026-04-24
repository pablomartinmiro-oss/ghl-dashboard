import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

const validateSchema = z.object({
  code: z.string().min(1).max(40),
  orderCents: z.number().int().min(0).optional(),
  category: z.string().max(50).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;

  const body = await request.json();
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { code, orderCents, category } = parsed.data;
  const upper = code.toUpperCase();

  const promotion = await prisma.promotion.findUnique({
    where: { tenantId_code: { tenantId, code: upper } },
  });
  if (!promotion) {
    return NextResponse.json(
      { valid: false, reason: "Código no encontrado" },
      { status: 200 }
    );
  }

  const now = new Date();
  if (promotion.status !== "active") {
    return NextResponse.json({ valid: false, reason: "Promoción inactiva" });
  }
  if (promotion.validFrom > now) {
    return NextResponse.json({ valid: false, reason: "Promoción aún no activa" });
  }
  if (promotion.validUntil < now) {
    return NextResponse.json({ valid: false, reason: "Promoción expirada" });
  }
  if (
    promotion.maxUses !== null &&
    promotion.currentUses >= promotion.maxUses
  ) {
    return NextResponse.json({ valid: false, reason: "Promoción agotada" });
  }
  if (
    promotion.minOrderCents !== null &&
    orderCents !== undefined &&
    orderCents < promotion.minOrderCents
  ) {
    return NextResponse.json({
      valid: false,
      reason: "Monto mínimo no alcanzado",
    });
  }

  if (category && promotion.applicableTo) {
    const applicable = promotion.applicableTo as {
      categories?: string[];
    } | null;
    if (
      applicable?.categories &&
      applicable.categories.length > 0 &&
      !applicable.categories.includes(category)
    ) {
      return NextResponse.json({
        valid: false,
        reason: "No aplica a esta categoría",
      });
    }
  }

  let discountCents = 0;
  if (promotion.type === "percentage" && promotion.value && orderCents) {
    discountCents = Math.floor((orderCents * promotion.value) / 100);
  } else if (promotion.type === "fixed" && promotion.value) {
    discountCents = promotion.value;
  }

  return NextResponse.json({
    valid: true,
    promotion: {
      id: promotion.id,
      name: promotion.name,
      code: promotion.code,
      type: promotion.type,
      value: promotion.value,
      discountCents,
    },
  });
}
