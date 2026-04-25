"use client";

import { useMemo, useState } from "react";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import {
  usePayments,
  useRefundPayment,
  type Payment,
  type PaymentProvider,
  type PaymentStatus,
} from "@/hooks/usePayments";

const STATUSES: { value: PaymentStatus | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "processing", label: "Procesando" },
  { value: "succeeded", label: "Completado" },
  { value: "failed", label: "Fallido" },
  { value: "refunded", label: "Reembolsado" },
  { value: "cancelled", label: "Cancelado" },
];

const PROVIDERS: { value: PaymentProvider | ""; label: string }[] = [
  { value: "", label: "Todos los proveedores" },
  { value: "redsys", label: "Redsys" },
  { value: "stripe", label: "Stripe" },
  { value: "manual", label: "Manual" },
];

const STATUS_BADGE: Record<PaymentStatus, string> = {
  pending: "bg-warm-gold/15 text-warm-gold",
  processing: "bg-blue-100 text-blue-800",
  succeeded: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
  cancelled: "bg-zinc-200 text-zinc-700",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  succeeded: "Completado",
  failed: "Fallido",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

const PROVIDER_BADGE: Record<PaymentProvider, string> = {
  redsys: "bg-blue-100 text-blue-800",
  stripe: "bg-purple-100 text-purple-800",
  manual: "bg-zinc-200 text-zinc-700",
};

function fmt(cents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PagosPage() {
  const [status, setStatus] = useState<string>("");
  const [provider, setProvider] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [refunding, setRefunding] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      status: status || undefined,
      provider: provider || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [status, provider, dateFrom, dateTo]
  );

  const { data, isLoading, refetch } = usePayments(filters);
  const refund = useRefundPayment();

  const payments = data?.payments ?? [];
  const stats = data?.stats ?? { revenueCents: 0, pending: 0, refunded: 0, today: 0 };

  async function handleRefund(p: Payment) {
    if (!confirm(`Reembolsar ${fmt(p.amountCents)} a ${p.customerName}?`)) return;
    setRefunding(p.id);
    try {
      await refund.mutateAsync({ id: p.id });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al reembolsar");
    } finally {
      setRefunding(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Pagos</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Cobros, reembolsos y conciliacion
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Ingresos" value={fmt(stats.revenueCents)} cls="text-emerald-700" mono />
        <StatCard label="Hoy" value={String(stats.today)} cls="text-text-primary" />
        <StatCard label="Pendientes" value={String(stats.pending)} cls="text-warm-gold" />
        <StatCard label="Reembolsados" value={String(stats.refunded)} cls="text-purple-700" />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-warm-border bg-white p-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-3 py-1.5 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-3 py-1.5 text-sm"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-3 py-1.5 text-sm"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-3 py-1.5 text-sm"
        />
        {(status || provider || dateFrom || dateTo) && (
          <button
            onClick={() => { setStatus(""); setProvider(""); setDateFrom(""); setDateTo(""); }}
            className="rounded-[10px] px-3 py-1.5 text-sm text-text-secondary hover:bg-warm-muted"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-right">Importe</th>
              <th className="px-3 py-2 text-left">Proveedor</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-text-secondary">Cargando…</td></tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-text-secondary">
                    <CreditCard className="h-8 w-8 text-text-secondary" />
                    <p className="text-sm">Aun no hay pagos. Cuando un cliente complete un pago aparecera aqui.</p>
                  </div>
                </td>
              </tr>
            ) : payments.map((p) => (
              <tr key={p.id} className="hover:bg-warm-muted/30">
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-text-secondary">{fmtDate(p.createdAt)}</td>
                <td className="px-3 py-2.5 font-medium text-text-primary">{p.customerName}</td>
                <td className="px-3 py-2.5 text-text-secondary">{p.customerEmail}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmt(p.amountCents)}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium capitalize ${PROVIDER_BADGE[p.provider]}`}>
                    {p.provider}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {p.status === "succeeded" && (
                    <button
                      onClick={() => handleRefund(p)}
                      disabled={refunding === p.id}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-warm-border bg-white px-2 py-1 text-xs font-medium hover:bg-warm-muted disabled:opacity-60"
                    >
                      {refunding === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      Reembolsar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, cls, mono }: { label: string; value: string; cls: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${cls} ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
