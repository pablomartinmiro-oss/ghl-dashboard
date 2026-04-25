import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { logger } from "@/lib/logger";
import { calculateDynamicPrice } from "@/lib/pricing/dynamic";
import { getOccupancy } from "@/lib/pricing/occupancy";

const schema = z.object({
  basePriceCents: z.number().int().min(0),
  date: z.string().datetime(),
  daysAdvance: z.number().int().min(0).optional(),
  occupancyPct: z.number().int().min(0).max(100).optional(),
  groupSize: z.number().int().min(1).optional(),
  loyaltyTier: z.string().nullable().optional(),
  destinationId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  recordHistory: z.boolean().optional(),
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
    const date = new Date(d.date);

    let occupancyPct = d.occupancyPct;
    if (occupancyPct === undefined && d.destinationId) {
      occupancyPct = await getOccupancy(tenantId, d.destinationId, date);
    }

    const daysAdvance = d.daysAdvance ?? Math.max(0, Math.floor((date.getTime() - Date.now()) / 86400000));

    const result = await calculateDynamicPrice({
      tenantId,
      basePriceCents: d.basePriceCents,
      date,
      daysAdvance,
      occupancyPct,
      groupSize: d.groupSize,
      loyaltyTier: d.loyaltyTier ?? null,
      destinationId: d.destinationId ?? null,
      categoryId: d.categoryId ?? null,
      productId: d.productId ?? null,
      recordHistory: d.recordHistory,
    });

    return NextResponse.json({ ...result, occupancyPct, daysAdvance });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to calculate dynamic price");
    return NextResponse.json({ error: "Failed to calculate price" }, { status: 500 });
  }
}
