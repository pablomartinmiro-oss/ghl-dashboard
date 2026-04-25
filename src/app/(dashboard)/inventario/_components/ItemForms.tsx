"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useCreateItem, useBulkCreateItems } from "@/hooks/useInventory";

type Opt = { id: string; name: string };

export function SingleItemForm({ categories, destinations, onClose }: {
  categories: Opt[];
  destinations: Opt[];
  onClose: () => void;
}) {
  const create = useCreateItem();
  const [form, setForm] = useState({
    categoryId: "",
    destinationId: "",
    name: "",
    brand: "",
    size: "",
  });

  const submit = async () => {
    if (!form.categoryId || !form.destinationId || !form.name || !form.size) return;
    await create.mutateAsync({
      categoryId: form.categoryId,
      destinationId: form.destinationId,
      name: form.name,
      brand: form.brand || null,
      size: form.size,
    });
    onClose();
  };

  return (
    <FormShell title="Nuevo item" onClose={onClose}>
      <Select label="Categoría" value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })} options={categories} />
      <Select label="Destino" value={form.destinationId} onChange={(v) => setForm({ ...form, destinationId: v })} options={destinations} />
      <Field label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Field label="Marca" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
      <Field label="Talla" value={form.size} onChange={(v) => setForm({ ...form, size: v })} />
      <div className="flex items-end">
        <button
          onClick={submit}
          disabled={create.isPending}
          className="w-full rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
        >
          Crear item
        </button>
      </div>
    </FormShell>
  );
}

export function BulkItemForm({ categories, destinations, onClose }: {
  categories: Opt[];
  destinations: Opt[];
  onClose: () => void;
}) {
  const create = useBulkCreateItems();
  const [form, setForm] = useState({
    categoryId: "",
    destinationId: "",
    nameTemplate: "",
    brand: "",
    size: "",
    quantity: 5,
  });

  const submit = async () => {
    if (!form.categoryId || !form.destinationId || !form.nameTemplate || !form.size) return;
    await create.mutateAsync({
      categoryId: form.categoryId,
      destinationId: form.destinationId,
      nameTemplate: form.nameTemplate,
      brand: form.brand || undefined,
      size: form.size,
      quantity: form.quantity,
    });
    onClose();
  };

  return (
    <FormShell title="Nuevo lote" onClose={onClose}>
      <Select label="Categoría" value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })} options={categories} />
      <Select label="Destino" value={form.destinationId} onChange={(v) => setForm({ ...form, destinationId: v })} options={destinations} />
      <Field label="Nombre base" value={form.nameTemplate} onChange={(v) => setForm({ ...form, nameTemplate: v })} />
      <Field label="Marca" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
      <Field label="Talla" value={form.size} onChange={(v) => setForm({ ...form, size: v })} />
      <Field
        label="Cantidad"
        type="number"
        value={String(form.quantity)}
        onChange={(v) => setForm({ ...form, quantity: Math.max(1, parseInt(v) || 1) })}
      />
      <div className="col-span-full">
        <button
          onClick={submit}
          disabled={create.isPending}
          className="rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
        >
          Crear {form.quantity} items
        </button>
      </div>
    </FormShell>
  );
}

function FormShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <button onClick={onClose} className="rounded-[8px] p-1 text-text-secondary hover:bg-warm-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-normal text-text-primary"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-normal text-text-primary"
      >
        <option value="">Seleccionar…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </label>
  );
}
