import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { calculateDynamicPrice } from "@/lib/pricing/dynamic";
import { getOccupancy } from "@/lib/pricing/occupancy";

const schema = z.object({
  productId: z.string().optional(),
  basePriceCents: z.number().int().min(0).optional(),
  destinationId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupSize: z.number().int().min(1).optional(),
  loyaltyTier: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const d = parsed.data;

    let basePriceCents = d.basePriceCents ?? 0;
    let productName: string | null = null;
    if (d.productId) {
      const product = await prisma.product.findFirst({
        where: {
          id: d.productId,
          OR: [{ tenantId }, { tenantId: null }],
        },
        select: { id: true, name: true, price: true, category: true },
      });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      productName = product.name;
      if (!d.basePriceCents) basePriceCents = Math.round(product.price * 100);
    }

    if (basePriceCents <= 0) {
      return NextResponse.json({ error: "basePriceCents required when no productId" }, { status: 400 });
    }

    const start = new Date(d.startDate);
    const end = new Date(d.endDate);
    if (end < start) {
      return NextResponse.json({ error: "endDate must be after startDate" }, { status: 400 });
    }
    const dayMs = 86400000;
    const numDays = Math.min(180, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);

    const points: Array<{
      date: string;
      basePriceCents: number;
      finalPriceCents: number;
      savingsPercent: number;
      occupancyPct: number;
      daysAdvance: number;
      rulesApplied: { ruleId: string; name: string; deltaCents: number }[];
    }> = [];

    for (let i = 0; i < numDays; i++) {
      const date = new Date(start.getTime() + i * dayMs);
      const occupancyPct = d.destinationId
        ? await getOccupancy(tenantId, d.destinationId, date)
        : 0;
      const daysAdvance = Math.max(0, Math.floor((date.getTime() - Date.now()) / dayMs));

      const result = await calculateDynamicPrice({
        tenantId,
        basePriceCents,
        date,
        daysAdvance,
        occupancyPct,
        groupSize: d.groupSize,
        loyaltyTier: d.loyaltyTier ?? null,
        destinationId: d.destinationId ?? null,
        categoryId: d.categoryId ?? null,
        productId: d.productId ?? null,
        recordHistory: false,
      });

      points.push({
        date: date.toISOString(),
        basePriceCents: result.basePriceCents,
        finalPriceCents: result.finalPriceCents,
        savingsPercent: result.savingsPercent,
        occupancyPct,
        daysAdvance,
        rulesApplied: result.rulesApplied.map((r) => ({
          ruleId: r.ruleId,
          name: r.name,
          deltaCents: r.deltaCents,
        })),
      });
    }

    return NextResponse.json({ productName, basePriceCents, points });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to simulate pricing");
    return NextResponse.json({ error: "Failed to simulate pricing" }, { status: 500 });
  }
}
