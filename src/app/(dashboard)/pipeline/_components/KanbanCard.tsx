"use client";

import { User } from "lucide-react";
import type { GHLOpportunity } from "@/lib/ghl/types";

interface KanbanCardProps {
  opportunity: GHLOpportunity;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KanbanCard({ opportunity }: KanbanCardProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-3 transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
      <p className="mb-1 text-sm font-medium leading-tight text-text-primary">
        {opportunity.name}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-success">
          {formatCurrency(opportunity.monetaryValue)}
        </span>
        {opportunity.assignedTo && (
          <div className="flex items-center gap-1 text-[10px] text-text-secondary">
            <User className="h-3 w-3" />
            Assigned
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[10px] text-text-secondary">{opportunity.status}</p>
    </div>
  );
}
