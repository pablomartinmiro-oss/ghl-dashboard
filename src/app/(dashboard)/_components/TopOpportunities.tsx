"use client";

import Link from "next/link";
import { DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { GHLOpportunity } from "@/lib/ghl/types";

interface TopOpportunitiesProps {
  opportunities: GHLOpportunity[];
  loading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function TopOpportunities({
  opportunities,
  loading,
}: TopOpportunitiesProps) {
  const sorted = [...opportunities]
    .sort((a, b) => b.monetaryValue - a.monetaryValue)
    .slice(0, 5);

  return (
    <div className="rounded-[14px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Top Opportunities</h2>
        <Link href="/pipeline" className="text-xs text-cyan hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))
        ) : sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">No opportunities yet</p>
        ) : (
          sorted.map((opp) => (
            <Link
              key={opp.id}
              href="/pipeline"
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <DollarSign className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{opp.name}</p>
                <p className="text-xs font-semibold text-success">
                  {formatCurrency(opp.monetaryValue)}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                opp.status === "won"
                  ? "bg-success/10 text-success"
                  : opp.status === "open"
                    ? "bg-cyan-light text-cyan"
                    : "bg-muted text-text-secondary"
              }`}>
                {opp.status}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
