"use client";

import { useState } from "react";
import { Wrench, Plus, FileSignature, TrendingDown, Package, Trash2, Archive } from "lucide-react";
import {
  useEquipmentUnits,
  useCreateEquipmentUnit,
  useUpdateEquipmentUnit,
  useDeleteEquipmentUnit,
  useWaivers,
  useCreateWaiver,
  type EquipmentUnit,
} from "@/hooks/useEquipment";

const eur = (cents: number | null) =>
  cents == null
    ? "—"
    : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const CONDITION_META: Record<string, { label: string; cls: string }> = {
  new: { label: "Nuevo", cls: "bg-emerald-100 text-emerald-700" },
  good: { label: "Bueno", cls: "bg-blue-100 text-blue-700" },
  fair: { label: "Regular", cls: "bg-amber-100 text-amber-700" },
  maintenance: { label: "Mantenimiento", cls: "bg-orange-100 text-orange-700" },
  retired: { label: "Retirado", cls: "bg-zinc-100 text-zinc-600" },
};

function depreciation(unit: EquipmentUnit): number {
  if (!unit.purchaseCents || !unit.purchaseDate) return 0;
  const months = Math.max(
    0,
    (Date.now() - new Date(unit.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  // Linear depreciation over 5 years (60 months)
  const pct = Math.min(1, months / 60);
  return Math.round(unit.purchaseCents * pct);
}

export default function EquipamientoPage() {
  const [tab, setTab] = useState<"units" | "waivers">("units");
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showWaiverForm, setShowWaiverForm] = useState(false);

  const { data: units = [] } = useEquipmentUnits({ includeRetired: false });
  const { data: waivers = [] } = useWaivers();
  const create = useCreateEquipmentUnit();
  const update = useUpdateEquipmentUnit();
  const del = useDeleteEquipmentUnit();
  const createWaiver = useCreateWaiver();

  const totalValue = units.reduce((s, u) => s + (u.currentValue ?? u.purchaseCents ?? 0), 0);
  const totalDepreciation = units.reduce((s, u) => s + depreciation(u), 0);
  const totalRentals = units.reduce((s, u) => s + u.totalRentals, 0);

  const remove = async (u: EquipmentUnit) => {
    if (!confirm(`¿Eliminar la unidad "${u.brand} ${u.model}" (${u.serialNumber})?`)) return;
    await del.mutateAsync(u.id);
  };

  const retire = async (u: EquipmentUnit) => {
    if (!confirm(`¿Retirar la unidad "${u.brand} ${u.model}"?`)) return;
    await update.mutateAsync({ id: u.id, retire: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Equipamiento</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Trazabilidad de unidades, depreciación y waivers digitales
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWaiverForm(true)}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <FileSignature className="h-4 w-4" /> Nuevo waiver
          </button>
          <button
            onClick={() => setShowUnitForm(true)}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            <Plus className="h-4 w-4" /> Nueva unidad
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Package className="h-4 w-4 text-coral" />} label="Unidades" value={String(units.length)} />
        <Stat icon={<TrendingDown className="h-4 w-4 text-coral" />} label="Valor actual" value={eur(totalValue)} />
        <Stat icon={<Wrench className="h-4 w-4 text-coral" />} label="Depreciación acumulada" value={eur(totalDepreciation)} />
        <Stat icon={<FileSignature className="h-4 w-4 text-coral" />} label="Alquileres totales" value={String(totalRentals)} />
      </div>

      <div className="flex gap-1 rounded-[10px] bg-warm-muted p-1">
        <button
          onClick={() => setTab("units")}
          className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm font-medium ${
            tab === "units" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
          }`}
        >
          Unidades ({units.length})
        </button>
        <button
          onClick={() => setTab("waivers")}
          className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm font-medium ${
            tab === "waivers" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
          }`}
        >
          Waivers ({waivers.length})
        </button>
      </div>

      {tab === "units" && (
        <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left">Serie</th>
                <th className="px-3 py-2 text-left">Marca / Modelo</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-left">Compra</th>
                <th className="px-3 py-2 text-left">Valor</th>
                <th className="px-3 py-2 text-left">Alquileres</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-sm text-text-secondary">
                    Aún no hay unidades — añade la primera
                  </td>
                </tr>
              ) : (
                units.map((u) => {
                  const meta = CONDITION_META[u.condition] ?? CONDITION_META.good;
                  return (
                    <tr key={u.id} className="hover:bg-warm-muted/30">
                      <td className="px-3 py-2.5 font-mono text-xs">{u.serialNumber}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-text-primary">{u.brand}</div>
                        <div className="text-xs text-text-secondary">{u.model}</div>
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">{u.category}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{fmtDate(u.purchaseDate)}</td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {eur(u.currentValue ?? u.purchaseCents)}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">{u.totalRentals}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => retire(u)}
                            className="rounded-[6px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-amber-600"
                            title="Retirar"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(u)}
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
      )}

      {tab === "waivers" && (
        <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Equipamiento</th>
                <th className="px-3 py-2 text-left">Firmado</th>
                <th className="px-3 py-2 text-left">Reserva</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {waivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-sm text-text-secondary">
                    Sin waivers todavía
                  </td>
                </tr>
              ) : (
                waivers.map((w) => (
                  <tr key={w.id} className="hover:bg-warm-muted/30">
                    <td className="px-3 py-2.5 font-medium text-text-primary">{w.customerName}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{w.customerEmail || "—"}</td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {w.equipment
                        ? `${w.equipment.brand} ${w.equipment.model} (${w.equipment.serialNumber})`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">{fmtDate(w.signedAt)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-text-secondary">
                      {w.reservationId || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showUnitForm && (
        <UnitFormModal
          units={units}
          onClose={() => setShowUnitForm(false)}
          onSubmit={async (data) => {
            await create.mutateAsync(data);
            setShowUnitForm(false);
          }}
        />
      )}

      {showWaiverForm && (
        <WaiverFormModal
          units={units}
          onClose={() => setShowWaiverForm(false)}
          onSubmit={async (data) => {
            await createWaiver.mutateAsync(data);
            setShowWaiverForm(false);
          }}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function UnitFormModal({
  onClose,
  onSubmit,
}: {
  units: EquipmentUnit[];
  onClose: () => void;
  onSubmit: (data: Partial<EquipmentUnit>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    serialNumber: "",
    brand: "",
    model: "",
    category: "ski",
    purchaseDate: "",
    purchaseCents: "",
    condition: "new" as EquipmentUnit["condition"],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      serialNumber: form.serialNumber,
      brand: form.brand,
      model: form.model,
      category: form.category,
      purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : null,
      purchaseCents: form.purchaseCents ? Math.round(parseFloat(form.purchaseCents) * 100) : null,
      condition: form.condition,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-text-primary">Nueva unidad</h2>
        <Field label="N° de serie">
          <input
            required
            className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marca">
            <input
              required
              className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
          </Field>
          <Field label="Modelo">
            <input
              required
              className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Categoría">
          <select
            className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="ski">Esquí</option>
            <option value="snowboard">Snowboard</option>
            <option value="boots">Botas</option>
            <option value="helmet">Casco</option>
            <option value="poles">Bastones</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de compra">
            <input
              type="date"
              className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            />
          </Field>
          <Field label="Precio compra (€)">
            <input
              type="number"
              step="0.01"
              className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
              value={form.purchaseCents}
              onChange={(e) => setForm({ ...form, purchaseCents: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Estado">
          <select
            className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value as EquipmentUnit["condition"] })}
          >
            <option value="new">Nuevo</option>
            <option value="good">Bueno</option>
            <option value="fair">Regular</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-warm-border px-3 py-2 text-sm text-text-primary hover:bg-warm-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            Crear
          </button>
        </div>
      </form>
    </div>
  );
}

function WaiverFormModal({
  units,
  onClose,
  onSubmit,
}: {
  units: EquipmentUnit[];
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    equipmentId: "",
    reservationId: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      customerName: form.customerName,
      customerEmail: form.customerEmail || null,
      equipmentId: form.equipmentId || null,
      reservationId: form.reservationId || null,
      signatureData: `signed:${Date.now()}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-text-primary">Nuevo waiver</h2>
        <Field label="Nombre del cliente">
          <input
            required
            className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
            value={form.customerEmail}
            onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
          />
        </Field>
        <Field label="Equipamiento (opcional)">
          <select
            className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
            value={form.equipmentId}
            onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
          >
            <option value="">— Sin equipamiento —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.brand} {u.model} · {u.serialNumber}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ID de reserva (opcional)">
          <input
            className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
            value={form.reservationId}
            onChange={(e) => setForm({ ...form, reservationId: e.target.value })}
          />
        </Field>
        <div className="rounded-[10px] bg-warm-muted p-3 text-xs text-text-secondary">
          Al guardar, se registra la firma digital con marca de tiempo.
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-warm-border px-3 py-2 text-sm text-text-primary hover:bg-warm-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            Firmar y guardar
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
