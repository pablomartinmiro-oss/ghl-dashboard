"use client";

import { TrendingUp, TrendingDown, Wallet, Percent } from "lucide-react";
import { fmtEUR, fmtPct } from "./utils";
import type { PnLSummary } from "@/hooks/useAccounting";

interface SummaryCardsProps {
  summary: PnLSummary | undefined;
  isLoading: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  const cards = [
    {
      key: "income",
      label: "Ingresos",
      value: summary ? fmtEUR(summary.incomeCents) : "—",
      icon: TrendingUp,
      color: "text-sage",
      bg: "bg-sage/10",
    },
    {
      key: "expense",
      label: "Gastos",
      value: summary ? fmtEUR(summary.expenseCents) : "—",
      icon: TrendingDown,
      color: "text-warm-danger",
      bg: "bg-warm-danger/10",
    },
    {
      key: "margin",
      label: "Margen Bruto",
      value: summary ? fmtEUR(summary.grossMarginCents) : "—",
      icon: Wallet,
      color: summary && summary.grossMarginCents < 0 ? "text-warm-danger" : "text-coral",
      bg: summary && summary.grossMarginCents < 0 ? "bg-warm-danger/10" : "bg-coral/10",
    },
    {
      key: "marginPct",
      label: "Margen %",
      value: summary ? fmtPct(summary.grossMarginPct) : "—",
      icon: Percent,
      color: summary && summary.grossMarginPct < 0 ? "text-warm-danger" : "text-sage",
      bg: summary && summary.grossMarginPct < 0 ? "bg-warm-danger/10" : "bg-sage/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className="rounded-2xl border border-warm-border bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                {c.label}
              </span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${c.bg}`}>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </div>
            <div className={`mt-3 font-mono text-2xl font-semibold ${c.color}`}>
              {isLoading ? (
                <span className="inline-block h-7 w-32 animate-pulse rounded bg-warm-muted" />
              ) : (
                c.value
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
