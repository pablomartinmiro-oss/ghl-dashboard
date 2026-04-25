import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

const RULE_TYPES = [
  "early_bird",
  "last_minute",
  "demand",
  "day_of_week",
  "group_size",
  "loyalty",
  "custom",
] as const;

const ADJUSTMENT_TYPES = ["percentage", "fixed_cents"] as const;

const createSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(RULE_TYPES),
  active: z.boolean().optional(),
  priority: z.number().int().optional(),
  minDaysAdvance: z.number().int().nullable().optional(),
  maxDaysAdvance: z.number().int().nullable().optional(),
  minOccupancyPct: z.number().int().min(0).max(100).nullable().optional(),
  maxOccupancyPct: z.number().int().min(0).max(100).nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  minGroupSize: z.number().int().nullable().optional(),
  loyaltyTiers: z.array(z.string()).nullable().optional(),
  destinationIds: z.array(z.string()).nullable().optional(),
  categoryIds: z.array(z.string()).nullable().optional(),
  adjustmentType: z.enum(ADJUSTMENT_TYPES),
  adjustmentValue: z.number().int(),
  maxDiscount: z.number().int().nullable().optional(),
  minPrice: z.number().int().nullable().optional(),
  stackable: z.boolean().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  try {
    const rules = await prisma.pricingRule.findMany({
      where: { tenantId },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ rules });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch pricing rules");
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const d = parsed.data;
    const rule = await prisma.pricingRule.create({
      data: {
        tenantId,
        name: d.name,
        type: d.type,
        active: d.active ?? true,
        priority: d.priority ?? 0,
        minDaysAdvance: d.minDaysAdvance ?? null,
        maxDaysAdvance: d.maxDaysAdvance ?? null,
        minOccupancyPct: d.minOccupancyPct ?? null,
        maxOccupancyPct: d.maxOccupancyPct ?? null,
        daysOfWeek: d.daysOfWeek ? (JSON.parse(JSON.stringify(d.daysOfWeek)) as Prisma.InputJsonValue) : Prisma.JsonNull,
        minGroupSize: d.minGroupSize ?? null,
        loyaltyTiers: d.loyaltyTiers ? (JSON.parse(JSON.stringify(d.loyaltyTiers)) as Prisma.InputJsonValue) : Prisma.JsonNull,
        destinationIds: d.destinationIds ? (JSON.parse(JSON.stringify(d.destinationIds)) as Prisma.InputJsonValue) : Prisma.JsonNull,
        categoryIds: d.categoryIds ? (JSON.parse(JSON.stringify(d.categoryIds)) as Prisma.InputJsonValue) : Prisma.JsonNull,
        adjustmentType: d.adjustmentType,
        adjustmentValue: d.adjustmentValue,
        maxDiscount: d.maxDiscount ?? null,
        minPrice: d.minPrice ?? null,
        stackable: d.stackable ?? false,
        validFrom: d.validFrom ? new Date(d.validFrom) : null,
        validUntil: d.validUntil ? new Date(d.validUntil) : null,
      },
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to create pricing rule");
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}
