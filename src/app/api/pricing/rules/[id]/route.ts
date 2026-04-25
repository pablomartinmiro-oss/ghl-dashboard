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

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  type: z.enum(RULE_TYPES).optional(),
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
  adjustmentType: z.enum(ADJUSTMENT_TYPES).optional(),
  adjustmentValue: z.number().int().optional(),
  maxDiscount: z.number().int().nullable().optional(),
  minPrice: z.number().int().nullable().optional(),
  stackable: z.boolean().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
});

function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const rule = await prisma.pricingRule.findFirst({ where: { id, tenantId } });
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ rule });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to fetch pricing rule");
    return NextResponse.json({ error: "Failed to fetch rule" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const existing = await prisma.pricingRule.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const data: Prisma.PricingRuleUpdateInput = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.type !== undefined) data.type = d.type;
    if (d.active !== undefined) data.active = d.active;
    if (d.priority !== undefined) data.priority = d.priority;
    if (d.minDaysAdvance !== undefined) data.minDaysAdvance = d.minDaysAdvance;
    if (d.maxDaysAdvance !== undefined) data.maxDaysAdvance = d.maxDaysAdvance;
    if (d.minOccupancyPct !== undefined) data.minOccupancyPct = d.minOccupancyPct;
    if (d.maxOccupancyPct !== undefined) data.maxOccupancyPct = d.maxOccupancyPct;
    if (d.daysOfWeek !== undefined) data.daysOfWeek = jsonOrNull(d.daysOfWeek);
    if (d.minGroupSize !== undefined) data.minGroupSize = d.minGroupSize;
    if (d.loyaltyTiers !== undefined) data.loyaltyTiers = jsonOrNull(d.loyaltyTiers);
    if (d.destinationIds !== undefined) data.destinationIds = jsonOrNull(d.destinationIds);
    if (d.categoryIds !== undefined) data.categoryIds = jsonOrNull(d.categoryIds);
    if (d.adjustmentType !== undefined) data.adjustmentType = d.adjustmentType;
    if (d.adjustmentValue !== undefined) data.adjustmentValue = d.adjustmentValue;
    if (d.maxDiscount !== undefined) data.maxDiscount = d.maxDiscount;
    if (d.minPrice !== undefined) data.minPrice = d.minPrice;
    if (d.stackable !== undefined) data.stackable = d.stackable;
    if (d.validFrom !== undefined) data.validFrom = d.validFrom ? new Date(d.validFrom) : null;
    if (d.validUntil !== undefined) data.validUntil = d.validUntil ? new Date(d.validUntil) : null;

    const rule = await prisma.pricingRule.update({ where: { id }, data });
    return NextResponse.json({ rule });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to update pricing rule");
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const existing = await prisma.pricingRule.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.pricingRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to delete pricing rule");
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
