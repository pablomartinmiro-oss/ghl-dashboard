"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  useMaintenanceLogs,
  useCreateMaintenance,
  useInventoryItems,
  type MaintenanceType,
} from "@/hooks/useInventory";

const TYPE_META: Record<MaintenanceType, { label: string; cls: string }> = {
  tuning: { label: "Ajuste", cls: "bg-blue-100 text-blue-800" },
  waxing: { label: "Encerado", cls: "bg-amber-100 text-amber-800" },
  repair: { label: "Reparación", cls: "bg-red-100 text-red-800" },
  inspection: { label: "Inspección", cls: "bg-zinc-200 text-zinc-800" },
  edge_sharpen: { label: "Afilado", cls: "bg-indigo-100 text-indigo-800" },
};

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MantenimientoPage() {
  const [open, setOpen] = useState(false);
  const { data: logs } = useMaintenanceLogs();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Mantenimiento
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Registro de servicios y reparaciones
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" /> Registrar
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Técnico</th>
              <th className="px-3 py-2 text-right">Coste</th>
              <th className="px-3 py-2 text-left">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {(logs ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-text-secondary">
                  Sin registros de mantenimiento
                </td>
              </tr>
            ) : logs?.map((log) => {
              const meta = TYPE_META[log.type];
              return (
                <tr key={log.id} className="hover:bg-warm-muted/30">
                  <td className="px-3 py-2.5 font-medium text-text-primary">
                    {log.item?.name ?? "—"}
                    {log.item?.size && (
                      <span className="ml-1 text-xs text-text-secondary">({log.item.size})</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary">{fmtDate(log.performedAt)}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{log.performedBy ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right text-text-primary">
                    {log.cost != null ? eur.format(log.cost / 100) : "—"}
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2.5 text-text-secondary">
                    {log.notes ?? log.description ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && <RegisterModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const create = useCreateMaintenance();
  const { data: items } = useInventoryItems();
  const [form, setForm] = useState<{
    itemId: string;
    type: MaintenanceType;
    description: string;
    cost: string;
    performedBy: string;
  }>({
    itemId: "",
    type: "tuning",
    description: "",
    cost: "",
    performedBy: "",
  });

  const submit = async () => {
    if (!form.itemId) return;
    const costEur = parseFloat(form.cost);
    await create.mutateAsync({
      itemId: form.itemId,
      type: form.type,
      description: form.description || null,
      cost: Number.isFinite(costEur) ? Math.round(costEur * 100) : null,
      performedBy: form.performedBy || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-warm-border bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Registrar mantenimiento</h2>
          <button onClick={onClose} className="rounded-[8px] p-1 text-text-secondary hover:bg-warm-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Item">
            <select
              value={form.itemId}
              onChange={(e) => setForm({ ...form, itemId: e.target.value })}
              className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar…</option>
              {items?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} · {i.size}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}
              className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
            >
              {(Object.keys(TYPE_META) as MaintenanceType[]).map((t) => (
                <option key={t} value={t}>{TYPE_META[t].label}</option>
              ))}
            </select>
          </Field>
          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Coste (€)">
              <input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Técnico">
              <input
                value={form.performedBy}
                onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
                className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <button
            onClick={submit}
            disabled={!form.itemId || create.isPending}
            className="w-full rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
          >
            Guardar registro
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-text-secondary">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
