"use client";

import { useState } from "react";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Download,
  Repeat,
  Target,
  Wallet,
} from "lucide-react";
import {
  useAnalyticsOverview,
  useAnalyticsRevenue,
  useAnalyticsCustomers,
  useAnalyticsFunnel,
} from "@/hooks/useAnalytics";

const eur = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

const PERIODS = [
  { value: 7, label: "7 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
  { value: 365, label: "1 año" },
];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data: overview } = useAnalyticsOverview(days);
  const { data: revenue } = useAnalyticsRevenue(days);
  const { data: customers } = useAnalyticsCustomers();
  const { data: funnel } = useAnalyticsFunnel(days);

  const kpis = overview?.kpis;
  const maxRev = Math.max(1, ...(revenue?.series ?? []).map((s) => s.cents));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Analytics</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Inteligencia de negocio y métricas operativas
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <a
            href={`/api/analytics/export?dataset=reservations&days=${days}`}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-4 w-4 text-coral" />}
          label="Ingresos"
          value={kpis ? eur(kpis.revenueCents) : "—"}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-coral" />}
          label="Beneficio neto"
          value={kpis ? eur(kpis.netCents) : "—"}
        />
        <KpiCard
          icon={<ShoppingCart className="h-4 w-4 text-coral" />}
          label="Reservas"
          value={kpis ? String(kpis.confirmedReservations) : "—"}
          sub={kpis ? `${kpis.reservations} totales` : ""}
        />
        <KpiCard
          icon={<Target className="h-4 w-4 text-coral" />}
          label="Conversión"
          value={kpis ? `${kpis.conversionRate}%` : "—"}
          sub={kpis ? `${kpis.paidQuotes}/${kpis.quotes} pagados` : ""}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-warm-border bg-white lg:col-span-2">
          <div className="border-b border-warm-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Ingresos diarios</h2>
          </div>
          <div className="p-4">
            {!revenue || revenue.series.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">Sin datos</p>
            ) : (
              <div className="flex h-48 items-end gap-1">
                {revenue.series.map((s) => {
                  const h = (s.cents / maxRev) * 100;
                  return (
                    <div
                      key={s.date}
                      className="flex-1 rounded-t-sm bg-coral/20 hover:bg-coral/40 transition-colors"
                      style={{ height: `${Math.max(2, h)}%` }}
                      title={`${s.date}: ${eur(s.cents)}`}
                    />
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex justify-between text-xs text-text-secondary">
              <span>{revenue?.series[0]?.date ?? ""}</span>
              <span className="font-medium text-text-primary">
                Total: {revenue ? eur(revenue.totalCents) : "—"}
              </span>
              <span>{revenue?.series[revenue.series.length - 1]?.date ?? ""}</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
          <div className="border-b border-warm-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Embudo de conversión</h2>
          </div>
          <div className="space-y-2 p-4">
            {!funnel || funnel.stages.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">Sin datos</p>
            ) : (
              funnel.stages.map((stage) => (
                <div key={stage.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary">{stage.label}</span>
                    <span className="text-text-secondary">{stage.count}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-warm-muted">
                    <div
                      className="h-full rounded-full bg-coral transition-all"
                      style={{ width: `${stage.pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
          <div className="border-b border-warm-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Clientes</h2>
          </div>
          <div className="space-y-3 p-4">
            <CustomerStat
              icon={<Users className="h-4 w-4 text-coral" />}
              label="Clientes únicos"
              value={customers ? String(customers.customers) : "—"}
            />
            <CustomerStat
              icon={<Repeat className="h-4 w-4 text-coral" />}
              label="Tasa de repetición"
              value={customers ? `${customers.repeatRate}%` : "—"}
              sub={customers ? `${customers.repeatCustomers} repiten` : ""}
            />
            <CustomerStat
              icon={<Wallet className="h-4 w-4 text-coral" />}
              label="CLV medio"
              value={customers ? eur(Math.round(customers.avgClv * 100)) : "—"}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-warm-border bg-white lg:col-span-2">
          <div className="border-b border-warm-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Top clientes</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-right">Reservas</th>
                <th className="px-3 py-2 text-right">Total gastado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {!customers || customers.topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-sm text-text-secondary">
                    Sin datos
                  </td>
                </tr>
              ) : (
                customers.topCustomers.map((c) => (
                  <tr key={c.email} className="hover:bg-warm-muted/30">
                    <td className="px-3 py-2 text-text-primary">{c.email}</td>
                    <td className="px-3 py-2 text-right text-text-secondary">{c.bookings}</td>
                    <td className="px-3 py-2 text-right font-medium text-text-primary">
                      {eur(Math.round(c.totalSpent * 100))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <div className="border-b border-warm-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Ingresos por categoría</h2>
        </div>
        <div className="space-y-2 p-4">
          {!revenue || revenue.categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-secondary">Sin datos</p>
          ) : (
            revenue.categories.map((c) => {
              const pct = (c.cents / Math.max(1, revenue.categories[0].cents)) * 100;
              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary capitalize">{c.category}</span>
                    <span className="text-text-secondary">{eur(c.cents)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-warm-muted">
                    <div
                      className="h-full rounded-full bg-coral transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs text-text-secondary">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

function CustomerStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-warm-border bg-warm-muted/30 px-3 py-2">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-xs text-text-secondary">{label}</p>
          {sub && <p className="text-xs text-text-secondary">{sub}</p>}
        </div>
      </div>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}
