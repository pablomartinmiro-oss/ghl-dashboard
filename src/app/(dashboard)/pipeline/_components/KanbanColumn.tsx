"use client";

import { Badge } from "@/components/ui/badge";
import { KanbanCard } from "./KanbanCard";
import type { GHLOpportunity, GHLPipelineStage } from "@/lib/ghl/types";

interface KanbanColumnProps {
  stage: GHLPipelineStage;
  opportunities: GHLOpportunity[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KanbanColumn({ stage, opportunities }: KanbanColumnProps) {
  const total = opportunities.reduce((sum, o) => sum + o.monetaryValue, 0);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{stage.name}</h3>
          <Badge variant="secondary" className="text-[10px]">
            {opportunities.length}
          </Badge>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
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
