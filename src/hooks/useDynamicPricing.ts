"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type PricingRuleType =
  | "early_bird"
  | "last_minute"
  | "demand"
  | "day_of_week"
  | "group_size"
  | "loyalty"
  | "custom";

export type AdjustmentType = "percentage" | "fixed_cents";

export interface PricingRule {
  id: string;
  name: string;
  type: PricingRuleType;
  active: boolean;
  priority: number;
  minDaysAdvance: number | null;
  maxDaysAdvance: number | null;
  minOccupancyPct: number | null;
  maxOccupancyPct: number | null;
  daysOfWeek: number[] | null;
  minGroupSize: number | null;
  loyaltyTiers: string[] | null;
  destinationIds: string[] | null;
  categoryIds: string[] | null;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  maxDiscount: number | null;
  minPrice: number | null;
  stackable: boolean;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuleInput {
  name: string;
  type: PricingRuleType;
  active?: boolean;
  priority?: number;
  minDaysAdvance?: number | null;
  maxDaysAdvance?: number | null;
  minOccupancyPct?: number | null;
  maxOccupancyPct?: number | null;
  daysOfWeek?: number[] | null;
  minGroupSize?: number | null;
  loyaltyTiers?: string[] | null;
  destinationIds?: string[] | null;
  categoryIds?: string[] | null;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  maxDiscount?: number | null;
  minPrice?: number | null;
  stackable?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
}

export interface SimulationPoint {
  date: string;
  basePriceCents: number;
  finalPriceCents: number;
  savingsPercent: number;
  occupancyPct: number;
  daysAdvance: number;
  rulesApplied: { ruleId: string; name: string; deltaCents: number }[];
}

export interface SimulationResult {
  productName: string | null;
  basePriceCents: number;
  points: SimulationPoint[];
}

export interface SimulationInput {
  productId?: string;
  basePriceCents?: number;
  destinationId?: string | null;
  categoryId?: string | null;
  startDate: string;
  endDate: string;
  groupSize?: number;
  loyaltyTier?: string | null;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

const json = { "Content-Type": "application/json" };

export function usePricingRules() {
  return useQuery({
    queryKey: ["pricing-rules"],
    queryFn: () => fetchJSON<{ rules: PricingRule[] }>("/api/pricing/rules"),
    select: (d) => d.rules,
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RuleInput) =>
      fetchJSON<{ rule: PricingRule }>("/api/pricing/rules", {
        method: "POST",
        headers: json,
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

export function useUpdatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & Partial<RuleInput>) => {
      const { id, ...body } = input;
      return fetchJSON<{ rule: PricingRule }>(`/api/pricing/rules/${id}`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/pricing/rules/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

export function useSimulatePricing() {
  return useMutation({
    mutationFn: (input: SimulationInput) =>
      fetchJSON<SimulationResult>("/api/pricing/simulate", {
        method: "POST",
        headers: json,
        body: JSON.stringify(input),
      }),
  });
}
