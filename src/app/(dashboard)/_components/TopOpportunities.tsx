"use client";

import Link from "next/link";
import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Top Opportunities</CardTitle>
        <Link
          href="/pipeline"
          className="text-xs text-muted-foreground hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No opportunities yet</p>
        ) : (
          sorted.map((opp) => (
            <Link
              key={opp.id}
              href="/pipeline"
              className="flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-50">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{opp.name}</p>
                <p className="text-xs font-semibold text-emerald-600">
                  {formatCurrency(opp.monetaryValue)}
                </p>
              </div>
              <Badge
                variant={opp.status === "won" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {opp.status}
              </Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
