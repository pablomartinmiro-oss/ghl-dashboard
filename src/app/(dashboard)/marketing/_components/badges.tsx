import { cn } from "@/lib/utils";
import type { CampaignStatus, CampaignType, PromotionStatus, PromotionType } from "@/hooks/useMarketing";

export const CAMPAIGN_STATUS_META: Record<
  CampaignStatus,
  { label: string; klass: string }
> = {
  draft: { label: "Borrador", klass: "bg-zinc-100 text-zinc-700" },
  scheduled: { label: "Programada", klass: "bg-blue-100 text-blue-700" },
  active: { label: "Activa", klass: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Pausada", klass: "bg-amber-100 text-amber-700" },
  completed: { label: "Completada", klass: "bg-purple-100 text-purple-700" },
  cancelled: { label: "Cancelada", klass: "bg-red-100 text-red-700" },
};

export const CAMPAIGN_TYPE_META: Record<
  CampaignType,
  { label: string; klass: string }
> = {
  email: { label: "Email", klass: "bg-coral/15 text-coral" },
  sms: { label: "SMS", klass: "bg-sage/15 text-sage" },
  whatsapp: { label: "WhatsApp", klass: "bg-emerald-100 text-emerald-700" },
  push: { label: "Push", klass: "bg-indigo-100 text-indigo-700" },
};

export const PROMO_STATUS_META: Record<
  PromotionStatus,
  { label: string; klass: string }
> = {
  active: { label: "Activa", klass: "bg-sage/15 text-sage" },
  expired: { label: "Expirada", klass: "bg-warm-muted text-text-secondary" },
  disabled: { label: "Deshabilitada", klass: "bg-red-100 text-red-700" },
};

export const PROMO_TYPE_LABEL: Record<PromotionType, string> = {
  percentage: "Porcentaje",
  fixed: "Importe fijo",
  "2x1": "2x1",
  free_extra: "Extra gratis",
};

export function StatusPill({
  meta,
}: {
  meta: { label: string; klass: string };
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        meta.klass
      )}
    >
      {meta.label}
    </span>
  );
}
