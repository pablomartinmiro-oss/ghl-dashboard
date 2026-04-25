"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Share2,
  Plus,
  TrendingUp,
  ShoppingCart,
  Percent,
  Activity,
  Settings,
  Trash2,
} from "lucide-react";
import {
  useChannels,
  useChannelsDashboard,
  useDeleteChannel,
  type Channel,
  type ChannelType,
} from "@/hooks/useChannels";
import {
  ChannelFormModal,
  EMPTY_CHANNEL_FORM,
  channelToForm,
  type ChannelFormState,
} from "./_components/ChannelFormModal";

const eur = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

const TYPE_META: Record<ChannelType, { label: string; cls: string }> = {
  ota: { label: "OTA", cls: "bg-blue-100 text-blue-700" },
  voucher: { label: "Cupón", cls: "bg-amber-100 text-amber-700" },
  direct: { label: "Directo", cls: "bg-emerald-100 text-emerald-700" },
  b2b: { label: "B2B", cls: "bg-purple-100 text-purple-700" },
  marketplace: { label: "Marketplace", cls: "bg-pink-100 text-pink-700" },
};

export default function CanalesPage() {
  const { data: dash, isLoading: dashLoading } = useChannelsDashboard();
  const { data: channels = [] } = useChannels();
  const del = useDeleteChannel();

  const [formState, setFormState] = useState<ChannelFormState | null>(null);

  const remove = async (c: Channel) => {
    if (!confirm(`¿Eliminar el canal "${c.name}"?`)) return;
    await del.mutateAsync(c.id);
  };

  const maxRevenue = Math.max(1, ...(dash?.channels ?? []).map((c) => c.revenueCents));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Canales</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Distribución y reservas por canal de venta
          </p>
        </div>
        <button
          onClick={() => setFormState(EMPTY_CHANNEL_FORM)}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" /> Nuevo canal
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Share2 className="h-4 w-4 text-coral" />}
          label="Canales activos"
          value={dashLoading ? "—" : String(dash?.activeChannels ?? 0)}
        />
        <StatCard
          icon={<ShoppingCart className="h-4 w-4 text-coral" />}
          label="Reservas mes"
          value={dashLoading ? "—" : String(dash?.totalBookings ?? 0)}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-coral" />}
          label="Ingresos mes"
          value={dashLoading ? "—" : eur(dash?.totalRevenueCents ?? 0)}
        />
        <StatCard
          icon={<Percent className="h-4 w-4 text-coral" />}
          label="Comisión mes"
          value={dashLoading ? "—" : eur(dash?.totalCommissionCents ?? 0)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <div className="border-b border-warm-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Ingresos por canal (mes)</h2>
        </div>
        <div className="space-y-2 p-4">
          {(dash?.channels ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-text-secondary">Sin datos todavía</p>
          ) : (
            dash?.channels.map((c) => {
              const pct = (c.revenueCents / maxRevenue) * 100;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary">{c.name}</span>
                    <span className="text-text-secondary">
                      {eur(c.revenueCents)} · {c.bookings} reservas
                    </span>
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

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <div className="flex items-center justify-between border-b border-warm-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Canales</h2>
          <span className="text-xs text-text-secondary">{channels.length} totales</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Comisión</th>
              <th className="px-3 py-2 text-left">Mapeos</th>
              <th className="px-3 py-2 text-left">Sync</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {channels.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-text-secondary">
                  Aún no hay canales — añade el primero
                </td>
              </tr>
            ) : (
              channels.map((c) => {
                const meta = TYPE_META[c.type] ?? { label: c.type, cls: "bg-zinc-100 text-zinc-700" };
                return (
                  <tr key={c.id} className="hover:bg-warm-muted/30">
                    <td className="px-3 py-2.5">
                      <Link href={`/canales/${c.id}`} className="font-medium text-text-primary hover:text-coral">
                        {c.name}
                      </Link>
                      <div className="text-xs text-text-secondary">{c.slug}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">{c.commissionPct}%</td>
                    <td className="px-3 py-2.5 text-text-secondary">{c._count?.mappings ?? 0}</td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      <Activity className={`h-4 w-4 ${c.syncEnabled ? "text-emerald-600" : "text-zinc-300"}`} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${
                        c.enabled ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {c.enabled ? "Activo" : "Pausado"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/canales/${c.id}`}
                          className="rounded-[6px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral"
                          title="Detalle"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setFormState(channelToForm(c))}
                          className="rounded-[6px] px-2 py-1 text-xs font-medium text-coral hover:bg-warm-muted"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => remove(c)}
                          className="rounded-[6px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {formState && <ChannelFormModal initial={formState} onClose={() => setFormState(null)} />}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs text-text-secondary">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}
