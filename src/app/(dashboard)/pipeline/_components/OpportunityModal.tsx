"use client";

import { X, User, Calendar, DollarSign, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GHLOpportunity } from "@/lib/ghl/types";

interface OpportunityModalProps {
  opportunity: GHLOpportunity;
  stageName: string;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Abierta", color: "bg-sage-light text-sage" },
  won: { label: "Ganada", color: "bg-coral-light text-coral" },
  lost: { label: "Perdida", color: "bg-muted-red-light text-muted-red" },
  abandoned: { label: "Abandonada", color: "bg-muted text-text-secondary" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OpportunityModal({ opportunity, stageName, onClose }: OpportunityModalProps) {
  const statusCfg = STATUS_LABELS[opportunity.status] ?? STATUS_LABELS.open;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">{opportunity.name}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {/* Value + Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-coral" />
              <span className="text-2xl font-bold text-text-primary">
                {formatCurrency(opportunity.monetaryValue)}
              </span>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid gap-3 rounded-lg border border-border bg-surface/50 p-4">
            <InfoRow icon={Tag} label="Etapa" value={stageName} />
            {opportunity.contactName && (
              <InfoRow icon={User} label="Contacto" value={opportunity.contactName} />
            )}
            {opportunity.assignedTo && (
              <InfoRow icon={User} label="Asignado a" value={opportunity.assignedTo} />
            )}
            <InfoRow icon={Calendar} label="Creada" value={formatDate(opportunity.createdAt)} />
            {opportunity.updatedAt && (
              <InfoRow icon={Calendar} label="Actualizada" value={formatDate(opportunity.updatedAt)} />
            )}
            {opportunity.lastActivity && (
              <InfoRow icon={Calendar} label="Última actividad" value={formatDate(opportunity.lastActivity)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-text-secondary">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}
