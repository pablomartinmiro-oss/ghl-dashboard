"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type CampaignType = "email" | "sms" | "whatsapp" | "push";
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export interface CampaignStats {
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  unsubscribed?: number;
}

export interface AudienceFilter {
  tags?: string[];
  destinations?: string[];
  lastActivityDays?: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject: string | null;
  content?: string | null;
  templateId?: string | null;
  audienceFilter?: AudienceFilter | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stats: CampaignStats | null;
  createdAt: string;
  updatedAt: string;
  _count?: { sends: number };
}

export type TemplateCategory =
  | "promotional"
  | "transactional"
  | "newsletter"
  | "welcome"
  | "reminder";

export interface TemplateVariable {
  key: string;
  label: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: TemplateCategory | null;
  variables: TemplateVariable[] | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PromotionType = "percentage" | "fixed" | "2x1" | "free_extra";
export type PromotionStatus = "active" | "expired" | "disabled";

export interface PromotionApplicable {
  categories?: string[];
  products?: string[];
  destinations?: string[];
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  type: PromotionType;
  value: number | null;
  description: string | null;
  validFrom: string;
  validUntil: string;
  maxUses: number | null;
  currentUses: number;
  minOrderCents: number | null;
  applicableTo: PromotionApplicable | null;
  status: PromotionStatus;
  createdAt: string;
  updatedAt: string;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

function buildQS(filters?: Record<string, string | undefined>): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ===== Campaigns =====
export function useCampaigns(filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ["marketing-campaigns", filters],
    queryFn: () =>
      fetchJSON<{ campaigns: Campaign[] }>(
        `/api/marketing/campaigns${buildQS(filters)}`
      ),
    select: (d) => d.campaigns,
  });
}

export interface CampaignInput {
  name: string;
  type: CampaignType;
  status?: CampaignStatus;
  subject?: string | null;
  content?: string | null;
  templateId?: string | null;
  audienceFilter?: AudienceFilter | null;
  scheduledAt?: string | null;
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignInput) =>
      fetchJSON<{ campaign: Campaign }>("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<CampaignInput> & { id: string }) =>
      fetchJSON<{ campaign: Campaign }>(`/api/marketing/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/marketing/campaigns/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean; queued: number }>(
        `/api/marketing/campaigns/${id}/send`,
        { method: "POST" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
  });
}

// ===== Templates =====
export function useTemplates(filters?: { category?: string }) {
  return useQuery({
    queryKey: ["marketing-templates", filters],
    queryFn: () =>
      fetchJSON<{ templates: EmailTemplate[] }>(
        `/api/marketing/templates${buildQS(filters)}`
      ),
    select: (d) => d.templates,
  });
}

export interface TemplateInput {
  name: string;
  subject: string;
  body: string;
  category?: TemplateCategory | null;
  variables?: TemplateVariable[];
  isDefault?: boolean;
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateInput) =>
      fetchJSON<{ template: EmailTemplate }>("/api/marketing/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<TemplateInput> & { id: string }) =>
      fetchJSON<{ template: EmailTemplate }>(`/api/marketing/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/marketing/templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-templates"] });
    },
  });
}

// ===== Promotions =====
export function usePromotions(filters?: { status?: string }) {
  return useQuery({
    queryKey: ["marketing-promotions", filters],
    queryFn: () =>
      fetchJSON<{ promotions: Promotion[] }>(
        `/api/marketing/promotions${buildQS(filters)}`
      ),
    select: (d) => d.promotions,
  });
}

export interface PromotionInput {
  name: string;
  code: string;
  type: PromotionType;
  value?: number | null;
  description?: string | null;
  validFrom: string;
  validUntil: string;
  maxUses?: number | null;
  minOrderCents?: number | null;
  applicableTo?: PromotionApplicable | null;
  status?: PromotionStatus;
}

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PromotionInput) =>
      fetchJSON<{ promotion: Promotion }>("/api/marketing/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-promotions"] });
    },
  });
}

export function useUpdatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<Omit<PromotionInput, "code">> & { id: string }) =>
      fetchJSON<{ promotion: Promotion }>(`/api/marketing/promotions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-promotions"] });
    },
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/marketing/promotions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-promotions"] });
    },
  });
}
