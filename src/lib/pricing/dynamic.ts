import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma, PricingRule } from "@/generated/prisma/client";

export type PricingRuleType =
  | "early_bird"
  | "last_minute"
  | "demand"
  | "day_of_week"
  | "group_size"
  | "loyalty"
  | "custom";

export type AdjustmentType = "percentage" | "fixed_cents";

export interface DynamicPriceParams {
  tenantId: string;
  basePriceCents: number;
  date: Date;
  daysAdvance?: number;
  occupancyPct?: number;
  groupSize?: number;
  loyaltyTier?: string | null;
  destinationId?: string | null;
  categoryId?: string | null;
  productId?: string | null;
  /** When false, do not write a PriceHistory row. Default true. */
  recordHistory?: boolean;
}

export interface AppliedRule {
  ruleId: string;
  name: string;
  type: PricingRuleType;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  deltaCents: number;
}

export interface DynamicPriceResult {
  basePriceCents: number;
  finalPriceCents: number;
  rulesApplied: AppliedRule[];
  savingsPercent: number;
  savingsCents: number;
}

function ruleMatches(rule: PricingRule, params: DynamicPriceParams): boolean {
  const now = new Date();
  if (rule.validFrom && now < rule.validFrom) return false;
  if (rule.validUntil && now > rule.validUntil) return false;

  if (rule.minDaysAdvance !== null && rule.minDaysAdvance !== undefined) {
    if (params.daysAdvance === undefined || params.daysAdvance < rule.minDaysAdvance) return false;
  }
  if (rule.maxDaysAdvance !== null && rule.maxDaysAdvance !== undefined) {
    if (params.daysAdvance === undefined || params.daysAdvance > rule.maxDaysAdvance) return false;
  }
  if (rule.minOccupancyPct !== null && rule.minOccupancyPct !== undefined) {
    if (params.occupancyPct === undefined || params.occupancyPct < rule.minOccupancyPct) return false;
  }
  if (rule.maxOccupancyPct !== null && rule.maxOccupancyPct !== undefined) {
    if (params.occupancyPct === undefined || params.occupancyPct > rule.maxOccupancyPct) return false;
  }

  if (rule.daysOfWeek) {
    const dows = rule.daysOfWeek as unknown as number[];
    if (Array.isArray(dows) && dows.length > 0 && !dows.includes(params.date.getDay())) return false;
  }
  if (rule.minGroupSize !== null && rule.minGroupSize !== undefined) {
    if ((params.groupSize ?? 0) < rule.minGroupSize) return false;
  }
  if (rule.loyaltyTiers) {
    const tiers = rule.loyaltyTiers as unknown as string[];
    if (Array.isArray(tiers) && tiers.length > 0) {
      if (!params.loyaltyTier || !tiers.includes(params.loyaltyTier)) return false;
    }
  }
  if (rule.destinationIds) {
    const ids = rule.destinationIds as unknown as string[];
    if (Array.isArray(ids) && ids.length > 0) {
      if (!params.destinationId || !ids.includes(params.destinationId)) return false;
    }
  }
  if (rule.categoryIds) {
    const ids = rule.categoryIds as unknown as string[];
    if (Array.isArray(ids) && ids.length > 0) {
      if (!params.categoryId || !ids.includes(params.categoryId)) return false;
    }
  }
  return true;
}

function applyAdjustment(currentCents: number, rule: PricingRule, baseCents: number): number {
  if (rule.adjustmentType === "percentage") {
    const delta = Math.round((baseCents * rule.adjustmentValue) / 100);
    return currentCents + delta;
  }
  // fixed_cents
  return currentCents + rule.adjustmentValue;
}

function clampDiscount(
  currentCents: number,
  baseCents: number,
  rule: PricingRule,
): number {
  // If a maxDiscount is set, ensure the discount (base - current) does not exceed it
  if (rule.maxDiscount !== null && rule.maxDiscount !== undefined) {
    const discount = baseCents - currentCents;
    if (discount > rule.maxDiscount) {
      return baseCents - rule.maxDiscount;
    }
  }
  // minPrice: never go below
  if (rule.minPrice !== null && rule.minPrice !== undefined) {
    if (currentCents < rule.minPrice) return rule.minPrice;
  }
  return currentCents;
}

export async function calculateDynamicPrice(
  params: DynamicPriceParams,
): Promise<DynamicPriceResult> {
  const rules = await prisma.pricingRule.findMany({
    where: { tenantId: params.tenantId, active: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const matching = rules.filter((r) => ruleMatches(r, params));

  let current = params.basePriceCents;
  const applied: AppliedRule[] = [];

  // Non-stackable: pick highest priority match (first in list since sorted desc), apply, stop.
  // Stackable: apply all stackable rules in priority order.
  const nonStackable = matching.filter((r) => !r.stackable);
  const stackable = matching.filter((r) => r.stackable);

  if (nonStackable.length > 0) {
    const top = nonStackable[0];
    const before = current;
    let after = applyAdjustment(current, top, params.basePriceCents);
    after = clampDiscount(after, params.basePriceCents, top);
    applied.push({
      ruleId: top.id,
      name: top.name,
      type: top.type as PricingRuleType,
      adjustmentType: top.adjustmentType as AdjustmentType,
      adjustmentValue: top.adjustmentValue,
      deltaCents: after - before,
    });
    current = after;
  }

  for (const rule of stackable) {
    const before = current;
    let after = applyAdjustment(current, rule, params.basePriceCents);
    after = clampDiscount(after, params.basePriceCents, rule);
    applied.push({
      ruleId: rule.id,
      name: rule.name,
      type: rule.type as PricingRuleType,
      adjustmentType: rule.adjustmentType as AdjustmentType,
      adjustmentValue: rule.adjustmentValue,
      deltaCents: after - before,
    });
    current = after;
  }

  const finalPriceCents = Math.max(0, Math.round(current));
  const savingsCents = params.basePriceCents - finalPriceCents;
  const savingsPercent = params.basePriceCents > 0
    ? Math.round((savingsCents / params.basePriceCents) * 100)
    : 0;

  if (params.recordHistory !== false && applied.length > 0) {
    try {
      await prisma.priceHistory.create({
        data: {
          tenantId: params.tenantId,
          productId: params.productId ?? null,
          destinationId: params.destinationId ?? null,
          date: params.date,
          basePriceCents: params.basePriceCents,
          finalPriceCents,
          rulesApplied: JSON.parse(JSON.stringify(applied)) as Prisma.InputJsonValue,
          occupancyPct: params.occupancyPct ?? null,
          daysAdvance: params.daysAdvance ?? null,
        },
      });
    } catch (error) {
      logger.warn({ error }, "Failed to record price history");
    }
  }

  return {
    basePriceCents: params.basePriceCents,
    finalPriceCents,
    rulesApplied: applied,
    savingsPercent,
    savingsCents,
  };
}
