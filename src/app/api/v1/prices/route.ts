import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-auth/verify";

export async function GET(request: NextRequest) {
  const auth = await verifyApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const dateStr = searchParams.get("date");
  const days = parseInt(searchParams.get("days") ?? "1", 10);
  const tier = searchParams.get("tier") ?? "media";

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: auth.tenantId },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const date = dateStr ? new Date(dateStr) : new Date();

  let basePrice = product.basePrice ?? 0;
  const matrix = product.pricingMatrix as Record<string, unknown> | null;
  if (matrix && matrix[tier]) {
    const tierMatrix = matrix[tier] as Record<string, number>;
    if (tierMatrix[String(days)]) {
      basePrice = tierMatrix[String(days)];
    }
  }

  // Apply pricing rules if any
  const rules = await prisma.pricingRule.findMany({
    where: {
      tenantId: auth.tenantId,
      active: true,
    },
  });

  let finalPrice = basePrice;
  const appliedRules: string[] = [];

  for (const rule of rules) {
    const adjustment = (rule.adjustmentPercent ?? 0) / 100;
    finalPrice = finalPrice * (1 + adjustment);
    appliedRules.push(rule.name);
  }

  return NextResponse.json({
    data: {
      productId,
      date: date.toISOString(),
      days,
      tier,
      basePrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      currency: "EUR",
      appliedRules,
    },
  });
}
