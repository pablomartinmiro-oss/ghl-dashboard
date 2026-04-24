"use client";

import { fmtEUR, categoryLabel } from "./utils";
import type { PnLSummary } from "@/hooks/useAccounting";

interface CategoryBreakdownProps {
  summary: PnLSummary | undefined;
}

export function CategoryBreakdown({ summary }: CategoryBreakdownProps) {
  if (!summary) return null;

  const entries = Object.entries(summary.byCategory).sort(
    (a, b) =>
      b[1].incomeCents + b[1].expenseCents - (a[1].incomeCents + a[1].expenseCents)
  );

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-warm-border bg-white p-6 text-center text-sm text-text-secondary">
        Sin datos en este período.
      </div>
    );
  }

  const max = Math.max(
    ...entries.map((e) => Math.max(e[1].incomeCents, e[1].expenseCents)),
    1
  );

  return (
    <div className="rounded-2xl border border-warm-border bg-white p-5">
      <h3 className="text-sm font-semibold text-text-primary">
        Desglose por categoría
      </h3>
      <p className="mt-0.5 text-xs text-text-secondary">
        Ingresos y gastos por tipo
      </p>
      <div className="mt-4 space-y-4">
        {entries.map(([cat, val]) => {
          const incomePct = (val.incomeCents / max) * 100;
          const expensePct = (val.expenseCents / max) * 100;
          return (
            <div key={cat} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-primary">
                  {categoryLabel(cat)}
                </span>
                <span className="font-mono text-text-secondary">
                  {fmtEUR(val.incomeCents - val.expenseCents)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-warm-muted">
                    <div
                      className="h-full rounded-full bg-sage"
                      style={{ width: `${incomePct}%` }}
                    />
                  </div>
                  <span className="w-24 text-right font-mono text-xs text-sage">
                    {fmtEUR(val.incomeCents)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-warm-muted">
                    <div
                      className="h-full rounded-full bg-warm-danger"
                      style={{ width: `${expensePct}%` }}
                    />
                  </div>
                  <span className="w-24 text-right font-mono text-xs text-warm-danger">
                    {fmtEUR(val.expenseCents)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
