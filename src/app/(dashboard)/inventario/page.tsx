"use client";

import { useState } from "react";
import { Plus, Search, Trash2, Pencil, Package } from "lucide-react";
import {
  useInventoryDashboard,
  useInventoryCategories,
  useInventoryItems,
  useDeleteItem,
  useUpdateItem,
  type InventoryItem,
  type ItemStatus,
  type ItemCondition,
} from "@/hooks/useInventory";
import { useDestinations } from "@/hooks/useWhiteLabel";
import { SingleItemForm, BulkItemForm } from "./_components/ItemForms";

const STATUS_META: Record<ItemStatus, { label: string; cls: string }> = {
  available: { label: "Disponible", cls: "bg-emerald-100 text-emerald-800" },
  reserved: { label: "Reservado", cls: "bg-blue-100 text-blue-800" },
  rented: { label: "Alquilado", cls: "bg-amber-100 text-amber-800" },
  maintenance: { label: "Mantenimiento", cls: "bg-zinc-200 text-zinc-800" },
  retired: { label: "Retirado", cls: "bg-red-100 text-red-800" },
};

const CONDITION_META: Record<ItemCondition, { label: string; cls: string }> = {
  new: { label: "Nuevo", cls: "bg-emerald-50 text-emerald-700" },
  good: { label: "Bueno", cls: "bg-sky-50 text-sky-700" },
  fair: { label: "Regular", cls: "bg-amber-50 text-amber-700" },
  maintenance: { label: "Mantenimiento", cls: "bg-zinc-100 text-zinc-700" },
  retired: { label: "Retirado", cls: "bg-red-50 text-red-700" },
};

type FormMode = null | "single" | "bulk";

export default function InventarioPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [formMode, setFormMode] = useState<FormMode>(null);

  const { data: dash } = useInventoryDashboard();
  const { data: categories } = useInventoryCategories();
  const { data: destinations } = useDestinations();
  const { data: items } = useInventoryItems({
    categoryId: categoryId || undefined,
    destinationId: destinationId || undefined,
    search: search || undefined,
  });

  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Inventario
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">Gestión de material</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFormMode((m) => (m === "bulk" ? null : "bulk"))}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <Package className="h-4 w-4" /> Añadir lote
          </button>
          <button
            onClick={() => setFormMode((m) => (m === "single" ? null : "single"))}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            <Plus className="h-4 w-4" /> Añadir item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={dash?.total ?? 0} cls="text-text-primary" />
        <StatCard label="Disponibles" value={dash?.available ?? 0} cls="text-emerald-700" />
        <StatCard label="Alquilados" value={dash?.rented ?? 0} cls="text-amber-700" />
        <StatCard label="Mantenimiento" value={dash?.maintenance ?? 0} cls="text-zinc-700" />
        <StatCard label="Retirados" value={dash?.retired ?? 0} cls="text-red-700" />
      </div>

      {formMode === "single" && (
        <SingleItemForm
          categories={categories ?? []}
          destinations={destinations ?? []}
          onClose={() => setFormMode(null)}
        />
      )}
      {formMode === "bulk" && (
        <BulkItemForm
          categories={categories ?? []}
          destinations={destinations ?? []}
          onClose={() => setFormMode(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, marca o serie"
            className="w-full rounded-[10px] border border-warm-border bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los destinos</option>
          {destinations?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CategoryTab active={categoryId === ""} onClick={() => setCategoryId("")} label="Todas" />
        {categories?.map((c) => (
          <CategoryTab
            key={c.id}
            active={categoryId === c.id}
            onClick={() => setCategoryId(c.id)}
            label={`${c.name}${c._count ? ` (${c._count.items})` : ""}`}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Marca</th>
              <th className="px-3 py-2 text-left">Talla</th>
              <th className="px-3 py-2 text-left">Destino</th>
              <th className="px-3 py-2 text-left">Condición</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {(items ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-text-secondary">
                  Sin items para los filtros seleccionados
                </td>
              </tr>
            ) : items?.map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                onDelete={() => {
                  if (confirm(`¿Eliminar "${it.name}"?`)) deleteItem.mutate(it.id);
                }}
                onCycleStatus={() => {
                  const order: ItemStatus[] = ["available", "reserved", "rented", "maintenance", "retired"];
                  const next = order[(order.indexOf(it.status) + 1) % order.length];
                  updateItem.mutate({ id: it.id, status: next });
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

function CategoryTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? "bg-coral text-white" : "border border-warm-border bg-white text-text-secondary hover:bg-warm-muted"
      }`}
    >
      {label}
    </button>
  );
}

function ItemRow({ item, onDelete, onCycleStatus }: {
  item: InventoryItem;
  onDelete: () => void;
  onCycleStatus: () => void;
}) {
  const status = STATUS_META[item.status];
  const cond = CONDITION_META[item.condition];
  return (
    <tr className="hover:bg-warm-muted/30">
      <td className="px-3 py-2.5 font-medium text-text-primary">{item.name}</td>
      <td className="px-3 py-2.5 text-text-secondary">{item.brand ?? "—"}</td>
      <td className="px-3 py-2.5 text-text-secondary">{item.size}</td>
      <td className="px-3 py-2.5 text-text-secondary">{item.destination?.name ?? "—"}</td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${cond.cls}`}>
          {cond.label}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${status.cls}`}>
          {status.label}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onCycleStatus}
            title="Cambiar estado"
            className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            className="rounded-[8px] p-1.5 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
