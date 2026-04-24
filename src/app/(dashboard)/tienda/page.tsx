"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Store, Inbox, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ConfigForm } from "./_components/ConfigForm";
import {
  useStorefrontConfig,
  useBookingRequests,
  useUpdateBookingRequest,
  type BookingRequestRow,
  type BookingRequestStatus,
} from "@/hooks/useStorefront";

const STATUS_META: Record<
  BookingRequestStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: "Pendiente", bg: "bg-warm-gold/15", text: "text-warm-gold" },
  contacted: { label: "Contactado", bg: "bg-blue-100", text: "text-blue-700" },
  quoted: { label: "Presupuestado", bg: "bg-indigo-100", text: "text-indigo-700" },
  confirmed: { label: "Confirmado", bg: "bg-sage/15", text: "text-sage" },
  cancelled: { label: "Cancelado", bg: "bg-warm-red/15", text: "text-warm-red" },
};

const STATUS_OPTIONS: BookingRequestStatus[] = [
  "pending",
  "contacted",
  "quoted",
  "confirmed",
  "cancelled",
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: BookingRequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}
    >
      {meta.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: "neutral" | "amber" | "sage";
}) {
  const tones = {
    neutral: "bg-warm-muted text-text-primary",
    amber: "bg-warm-gold/15 text-warm-gold",
    sage: "bg-sage/15 text-sage",
  } as const;
  return (
    <div className="rounded-[16px] border border-warm-border bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: BookingRequestStatus;
  onChange: (next: BookingRequestStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as BookingRequestStatus)}
      className="rounded-[6px] border border-warm-border bg-white px-2 py-1 text-xs text-text-primary focus:border-coral focus:outline-none disabled:opacity-60"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}

function RequestRow({ request }: { request: BookingRequestRow }) {
  const update = useUpdateBookingRequest();

  async function changeStatus(next: BookingRequestStatus) {
    if (next === request.status) return;
    try {
      await update.mutateAsync({ id: request.id, status: next });
      toast.success("Estado actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  return (
    <tr className="border-t border-warm-border">
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-text-primary">{request.customerName}</div>
        <div className="text-xs text-text-secondary">{request.customerEmail}</div>
      </td>
      <td className="px-4 py-3 text-sm text-text-primary">
        {fmtDate(request.startDate)}
        {request.endDate ? <span className="text-text-secondary"> → {fmtDate(request.endDate)}</span> : null}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary">
        {request.productIds.length} producto{request.productIds.length === 1 ? "" : "s"}
        {request.guests > 1 ? ` · ${request.guests} pax` : ""}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={request.status} />
      </td>
      <td className="px-4 py-3">
        <StatusSelect
          value={request.status}
          onChange={changeStatus}
          disabled={update.isPending}
        />
      </td>
    </tr>
  );
}

export default function TiendaAdminPage() {
  const { data: config } = useStorefrontConfig();
  const [filter, setFilter] = useState<BookingRequestStatus | "all">("all");
  const { data, isLoading } = useBookingRequests(filter === "all" ? undefined : filter);

  const requests = data?.requests ?? [];
  const counts = data?.statusCounts ?? {};

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: counts.pending ?? 0,
      confirmed: counts.confirmed ?? 0,
    }),
    [requests.length, counts]
  );

  const previewUrl = config?.slug ? `/tienda/${config.slug}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text-primary">
            <Store className="h-6 w-6 text-coral" />
            Tienda Online
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configuración de tu tienda pública
          </p>
        </div>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-start rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <ExternalLink className="h-4 w-4" />
            Ver tienda
          </a>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Solicitudes totales" value={stats.total} icon={Inbox} tone="neutral" />
        <StatCard label="Pendientes" value={stats.pending} icon={Clock} tone="amber" />
        <StatCard label="Confirmadas" value={stats.confirmed} icon={CheckCircle2} tone="sage" />
      </div>

      <ConfigForm />

      <section className="rounded-[16px] border border-warm-border bg-white">
        <div className="flex flex-col gap-3 border-b border-warm-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Solicitudes de reserva
            </h2>
            <p className="text-xs text-text-secondary">
              Solicitudes recibidas desde tu tienda pública.
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", ...STATUS_OPTIONS] as const).map((opt) => {
              const active = filter === opt;
              const label = opt === "all" ? "Todas" : STATUS_META[opt].label;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFilter(opt)}
                  className={`rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-coral text-white"
                      : "bg-warm-muted text-text-secondary hover:bg-warm-border"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-text-secondary">Cargando...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-secondary">
            No hay solicitudes {filter === "all" ? "" : `en estado "${STATUS_META[filter as BookingRequestStatus].label}"`}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-muted/50 text-left">
                  <th className="px-4 py-2 text-xs font-medium text-text-secondary">Cliente</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-secondary">Fecha</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-secondary">Productos</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-secondary">Estado</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-secondary">Cambiar</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <RequestRow key={r.id} request={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
