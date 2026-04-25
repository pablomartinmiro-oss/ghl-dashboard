"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Save, Activity } from "lucide-react";
import {
  useChannel,
  useChannelMappings,
  useUpsertChannelMappings,
  useChannelBookings,
  useSyncChannel,
  type ChannelMapping,
} from "@/hooks/useChannels";
import { useProducts } from "@/hooks/useProducts";

const eur = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Nunca";

interface MappingRow {
  productId: string;
  externalId: string;
  externalName: string;
  channelPrice: string;
  enabled: boolean;
}

export default function ChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: channel, isLoading } = useChannel(id);
  const { data: mappings = [] } = useChannelMappings(id);
  const { data: products = [] } = useProducts();
  const { data: bookings = [] } = useChannelBookings({ channelId: id });
  const upsert = useUpsertChannelMappings();
  const sync = useSyncChannel();

  const [rows, setRows] = useState<Record<string, MappingRow>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const map: Record<string, MappingRow> = {};
    for (const m of mappings) {
      map[m.productId] = {
        productId: m.productId,
        externalId: m.externalId ?? "",
        externalName: m.externalName ?? "",
        channelPrice: m.channelPrice !== null ? String(m.channelPrice / 100) : "",
        enabled: m.enabled,
      };
    }
    setRows(map);
  }, [mappings]);

  const productList = useMemo(
    () =>
      [...products].sort((a: { category: string; name: string }, b: { category: string; name: string }) =>
        a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)
      ),
    [products]
  );

  const setRow = (productId: string, patch: Partial<MappingRow>) => {
    setRows((r) => {
      const cur =
        r[productId] ?? {
          productId,
          externalId: "",
          externalName: "",
          channelPrice: "",
          enabled: false,
        };
      return { ...r, [productId]: { ...cur, ...patch } };
    });
  };

  const save = async () => {
    setError(null);
    try {
      const payload: Partial<ChannelMapping>[] = Object.values(rows)
        .filter((r) => r.enabled || r.externalId || r.externalName || r.channelPrice)
        .map((r) => ({
          productId: r.productId,
          externalId: r.externalId || null,
          externalName: r.externalName || null,
          channelPrice: r.channelPrice ? Math.round(Number(r.channelPrice) * 100) : null,
          enabled: r.enabled,
        }));
      await upsert.mutateAsync({ channelId: id, mappings: payload });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const triggerSync = async () => {
    setError(null);
    try {
      await sync.mutateAsync(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-text-secondary">Cargando canal…</div>;
  }
  if (!channel) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        Canal no encontrado.{" "}
        <Link href="/canales" className="text-coral hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/canales"
            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-coral"
          >
            <ArrowLeft className="h-3 w-3" /> Canales
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
            {channel.name}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {channel.slug} · Comisión {channel.commissionPct}% · Última sync: {fmt(channel.lastSyncAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={triggerSync}
            disabled={!channel.syncEnabled || sync.isPending}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted disabled:opacity-50"
            title={channel.syncEnabled ? "Sincronizar ahora" : "Sync desactivada"}
          >
            <RefreshCw className={`h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <div className="flex items-center justify-between border-b border-warm-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Mapeo de productos</h2>
            <p className="text-xs text-text-secondary">
              Vincula tus productos al ID/nombre del producto en {channel.name}
            </p>
          </div>
          <button
            onClick={save}
            disabled={upsert.isPending}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Guardar
          </button>
        </div>
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-warm-muted/80 text-xs font-medium text-text-secondary backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-left">External ID</th>
                <th className="px-3 py-2 text-left">External name</th>
                <th className="px-3 py-2 text-left">Precio canal (€)</th>
                <th className="px-3 py-2 text-center">Activo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {productList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-text-secondary">
                    No hay productos en el catálogo
                  </td>
                </tr>
              ) : (
                productList.map((p: { id: string; name: string; category: string; station: string }) => {
                  const row =
                    rows[p.id] ?? {
                      productId: p.id,
                      externalId: "",
                      externalName: "",
                      channelPrice: "",
                      enabled: false,
                    };
                  return (
                    <tr key={p.id} className="hover:bg-warm-muted/30">
                      <td className="px-3 py-2 font-medium text-text-primary">{p.name}</td>
                      <td className="px-3 py-2 text-text-secondary">{p.category}</td>
                      <td className="px-3 py-2">
                        <input
                          value={row.externalId}
                          onChange={(e) => setRow(p.id, { externalId: e.target.value })}
                          className="w-full rounded-[6px] border border-warm-border px-2 py-1 text-xs"
                          placeholder="ID en el canal"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.externalName}
                          onChange={(e) => setRow(p.id, { externalName: e.target.value })}
                          className="w-full rounded-[6px] border border-warm-border px-2 py-1 text-xs"
                          placeholder="Nombre en el canal"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.channelPrice}
                          onChange={(e) => setRow(p.id, { channelPrice: e.target.value })}
                          className="w-24 rounded-[6px] border border-warm-border px-2 py-1 text-xs"
                          placeholder="0,00"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) => setRow(p.id, { enabled: e.target.checked })}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <div className="flex items-center justify-between border-b border-warm-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Reservas desde este canal</h2>
          <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
            <Activity className="h-3 w-3" /> {bookings.length} totales
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Ref. canal</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Comisión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-text-secondary">
                  Aún no hay reservas desde este canal
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="hover:bg-warm-muted/30">
                  <td className="px-3 py-2 text-text-secondary">
                    {new Date(b.createdAt).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-3 py-2 font-medium text-text-primary">
                    {b.customerName}
                    {b.customerEmail && (
                      <div className="text-xs text-text-secondary">{b.customerEmail}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                    {b.externalRef ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary capitalize">{b.status}</td>
                  <td className="px-3 py-2 text-right font-medium">{eur(b.totalCents)}</td>
                  <td className="px-3 py-2 text-right text-text-secondary">
                    {eur(b.commissionCents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
