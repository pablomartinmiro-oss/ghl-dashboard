"use client";

import { use, useEffect, useState } from "react";
import { PortalNav } from "../_components/PortalNav";
import { usePortalAuth } from "../_components/usePortalAuth";
import { Loader2 } from "lucide-react";

interface Settlement {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalCents: number;
  commissionPct: number;
  commissionCents: number;
  netCents: number;
  status: string;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function formatCents(cents: number) {
  return eur.format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-warm-muted text-text-secondary",
  sent: "bg-warm-gold/15 text-warm-gold",
  confirmed: "bg-blue-50 text-blue-700",
  paid: "bg-sage-light text-sage",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  confirmed: "Confirmada",
  paid: "Pagada",
};

export default function SupplierPortalSettlementsPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId } = use(params);
  const { ready, authedFetch } = usePortalAuth(supplierId);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function load() {
      try {
        const [infoRes, settlementsRes] = await Promise.all([
          fetch(`/api/suppliers/portal/${supplierId}/info`),
          authedFetch(`/api/suppliers/portal/${supplierId}/settlements`),
        ]);
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (!cancelled) setSupplierName(info.supplier?.name ?? null);
        }
        if (!settlementsRes.ok) throw new Error("Error al cargar liquidaciones");
        const data = await settlementsRes.json();
        if (!cancelled) setSettlements(data.settlements ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ready, supplierId, authedFetch]);

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PortalNav supplierId={supplierId} supplierName={supplierName} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Liquidaciones
          </h1>
          <p className="text-sm text-text-secondary">
            Histórico completo de liquidaciones
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-coral" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-danger">{error}</div>
        ) : settlements.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-text-secondary shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            No hay liquidaciones registradas todavía.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Periodo
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Total
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Comisión
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Neto
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Estado
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Pagada
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-surface/30">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-text-primary">
                          {formatDate(s.periodStart)} → {formatDate(s.periodEnd)}
                        </div>
                        {s.notes && (
                          <div className="text-xs text-text-secondary">{s.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-text-primary">
                        {formatCents(s.totalCents)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-text-secondary">
                        {s.commissionPct}% · {formatCents(s.commissionCents)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-text-primary">
                        {formatCents(s.netCents)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[s.status] ?? STATUS_STYLES.draft
                          }`}
                        >
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatDate(s.paidAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
