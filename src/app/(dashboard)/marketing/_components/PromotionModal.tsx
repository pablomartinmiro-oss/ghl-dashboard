"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreatePromotion,
  useUpdatePromotion,
  type Promotion,
  type PromotionStatus,
  type PromotionType,
} from "@/hooks/useMarketing";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: Promotion | null;
}

interface FormState {
  name: string;
  code: string;
  type: PromotionType;
  value: string;
  description: string;
  validFrom: string;
  validUntil: string;
  maxUses: string;
  minOrderEuros: string;
  status: PromotionStatus;
}

const empty: FormState = {
  name: "",
  code: "",
  type: "percentage",
  value: "10",
  description: "",
  validFrom: "",
  validUntil: "",
  maxUses: "",
  minOrderEuros: "",
  status: "active",
};

const INPUT_CLS =
  "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral/30";

function toDateInput(v: string | null): string {
  return v ? v.slice(0, 10) : "";
}

export function PromotionModal({ open, onClose, initial }: Props) {
  const create = useCreatePromotion();
  const update = useUpdatePromotion();
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        code: initial.code,
        type: initial.type,
        value: initial.value?.toString() ?? "",
        description: initial.description ?? "",
        validFrom: toDateInput(initial.validFrom),
        validUntil: toDateInput(initial.validUntil),
        maxUses: initial.maxUses?.toString() ?? "",
        minOrderEuros: initial.minOrderCents
          ? (initial.minOrderCents / 100).toString()
          : "",
        status: initial.status,
      });
    } else {
      setForm(empty);
    }
  }, [initial, open]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Nombre y código son obligatorios");
      return;
    }
    if (!form.validFrom || !form.validUntil) {
      toast.error("Las fechas de validez son obligatorias");
      return;
    }

    const value = form.value ? parseInt(form.value, 10) : null;
    const valueCents =
      form.type === "fixed" && value !== null ? value * 100 : value;

    const minCents = form.minOrderEuros
      ? Math.round(parseFloat(form.minOrderEuros) * 100)
      : null;
    const maxUses = form.maxUses ? parseInt(form.maxUses, 10) : null;

    const validFromIso = new Date(form.validFrom + "T00:00:00").toISOString();
    const validUntilIso = new Date(
      form.validUntil + "T23:59:59"
    ).toISOString();

    try {
      if (initial) {
        await update.mutateAsync({
          id: initial.id,
          name: form.name.trim(),
          type: form.type,
          value: valueCents,
          description: form.description.trim() || null,
          validFrom: validFromIso,
          validUntil: validUntilIso,
          maxUses,
          minOrderCents: minCents,
          status: form.status,
        });
        toast.success("Promoción actualizada");
      } else {
        await create.mutateAsync({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: valueCents,
          description: form.description.trim() || null,
          validFrom: validFromIso,
          validUntil: validUntilIso,
          maxUses,
          minOrderCents: minCents,
          status: form.status,
        });
        toast.success("Promoción creada");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar promoción" : "Nueva promoción"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre">
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={INPUT_CLS}
                placeholder="Black Friday 2026"
                required
              />
            </Field>
            <Field label="Código">
              <input
                value={form.code}
                onChange={(e) =>
                  set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
                }
                className={`${INPUT_CLS} font-mono`}
                placeholder="BF2026"
                disabled={!!initial}
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as PromotionType)}
                className={INPUT_CLS}
              >
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Importe fijo (€)</option>
                <option value="2x1">2x1</option>
                <option value="free_extra">Extra gratis</option>
              </select>
            </Field>
            <Field
              label={
                form.type === "percentage"
                  ? "Valor (%)"
                  : form.type === "fixed"
                    ? "Valor (€)"
                    : "Valor"
              }
            >
              <input
                type="number"
                min="0"
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
          </div>
          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={`${INPUT_CLS} min-h-16`}
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Válido desde">
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => set("validFrom", e.target.value)}
                className={INPUT_CLS}
                required
              />
            </Field>
            <Field label="Válido hasta">
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
                className={INPUT_CLS}
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Usos máximos">
              <input
                type="number"
                min="0"
                value={form.maxUses}
                onChange={(e) => set("maxUses", e.target.value)}
                className={INPUT_CLS}
                placeholder="Ilimitado"
              />
            </Field>
            <Field label="Importe mínimo (€)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minOrderEuros}
                onChange={(e) => set("minOrderEuros", e.target.value)}
                className={INPUT_CLS}
                placeholder="Sin mínimo"
              />
            </Field>
          </div>
          <Field label="Estado">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as PromotionStatus)}
              className={INPUT_CLS}
            >
              <option value="active">Activa</option>
              <option value="disabled">Deshabilitada</option>
              <option value="expired">Expirada</option>
            </select>
          </Field>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-warm-border bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
            >
              {initial ? "Guardar cambios" : "Crear promoción"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
