"use client";

import { X } from "lucide-react";
import { useState } from "react";
import {
  useCreateChannel,
  useUpdateChannel,
  type Channel,
  type ChannelType,
} from "@/hooks/useChannels";

export interface ChannelFormState {
  id?: string;
  name: string;
  slug: string;
  type: ChannelType;
  enabled: boolean;
  commissionPct: number;
  syncEnabled: boolean;
}

export const EMPTY_CHANNEL_FORM: ChannelFormState = {
  name: "",
  slug: "",
  type: "ota",
  enabled: true,
  commissionPct: 0,
  syncEnabled: false,
};

export function channelToForm(c: Channel): ChannelFormState {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    type: c.type,
    enabled: c.enabled,
    commissionPct: c.commissionPct,
    syncEnabled: c.syncEnabled,
  };
}

interface Props {
  initial: ChannelFormState;
  onClose: () => void;
}

export function ChannelFormModal({ initial, onClose }: Props) {
  const [form, setForm] = useState<ChannelFormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateChannel();
  const update = useUpdateChannel();

  const submit = async () => {
    setError(null);
    try {
      if (form.id) {
        await update.mutateAsync({
          id: form.id,
          name: form.name,
          type: form.type,
          enabled: form.enabled,
          commissionPct: form.commissionPct,
          syncEnabled: form.syncEnabled,
        });
      } else {
        await create.mutateAsync({
          name: form.name,
          slug: form.slug,
          type: form.type,
          enabled: form.enabled,
          commissionPct: form.commissionPct,
          syncEnabled: form.syncEnabled,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">
            {form.id ? "Editar canal" : "Nuevo canal"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-[6px] p-1 text-text-secondary hover:bg-warm-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <div className="mb-3 rounded-[10px] border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <Field label="Nombre">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
              placeholder="Esquiades"
            />
          </Field>
          <Field label="Slug" hint="solo minúsculas, números, guiones">
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              disabled={!!form.id}
              className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm disabled:bg-warm-muted"
              placeholder="esquiades"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ChannelType })}
                className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
              >
                <option value="ota">OTA</option>
                <option value="voucher">Cupón</option>
                <option value="direct">Directo</option>
                <option value="b2b">B2B</option>
                <option value="marketplace">Marketplace</option>
              </select>
            </Field>
            <Field label="Comisión (%)">
              <input
                type="number"
                value={form.commissionPct}
                onChange={(e) =>
                  setForm({ ...form, commissionPct: Number(e.target.value) })
                }
                className="w-full rounded-[10px] border border-warm-border px-3 py-2 text-sm"
                min={0}
                max={100}
                step={0.1}
              />
            </Field>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Activo
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={form.syncEnabled}
                onChange={(e) => setForm({ ...form, syncEnabled: e.target.checked })}
              />
              Sincronización automática
            </label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!form.name || !form.slug || create.isPending || update.isPending}
            className="rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
          >
            {form.id ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-secondary">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-text-secondary">{hint}</p>}
    </div>
  );
}
