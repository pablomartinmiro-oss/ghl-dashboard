"use client";

import { DollarSign, User } from "lucide-react";
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function KanbanCard({ opportunity }: KanbanCardProps) {
  return (
    <div className="rounded-lg border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <p className="mb-2 text-sm font-medium leading-tight">
        {opportunity.name}
      </p>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(opportunity.monetaryValue)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatDate(opportunity.createdAt)}
        </span>
      </div>
      {opportunity.assignedTo && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <User className="h-3 w-3" />
          Assigned
        </div>
      )}
    </div>
  );
}
