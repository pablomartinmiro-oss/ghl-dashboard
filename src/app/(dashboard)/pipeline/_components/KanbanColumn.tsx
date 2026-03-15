"use client";

import { KanbanCard } from "./KanbanCard";
import type { GHLOpportunity, GHLPipelineStage } from "@/lib/ghl/types";

interface KanbanColumnProps {
  stage: GHLPipelineStage;
  opportunities: GHLOpportunity[];
  dotColor?: string;
}

const COLUMN_DOT_COLORS = [
  "bg-cyan",
  "bg-purple",
  "bg-warning",
  "bg-success",
  "bg-danger",
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KanbanColumn({ stage, opportunities, dotColor }: KanbanColumnProps) {
  const total = opportunities.reduce((sum, o) => sum + o.monetaryValue, 0);
  const color = dotColor ?? COLUMN_DOT_COLORS[stage.position % COLUMN_DOT_COLORS.length];

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <h3 className="text-sm font-semibold text-text-primary">{stage.name}</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-text-secondary">
            {opportunities.length}
          </span>
        </div>
        <span className="text-xs font-medium text-text-secondary">
          {formatCurrency(total)}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 pt-0">
        {opportunities.map((opp) => (
          <KanbanCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  );
}
