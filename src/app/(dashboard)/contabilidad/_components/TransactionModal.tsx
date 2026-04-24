"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSuppliers } from "@/hooks/useWhiteLabel";
import {
  useCreateTransaction,
  useUpdateTransaction,
  type Transaction,
} from "@/hooks/useAccounting";
import { TX_CATEGORIES, TX_TYPES, PAYMENT_METHODS } from "./utils";
import { toast } from "sonner";

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  initial?: Transaction | null;
}

interface FormState {
  type: string;
  category: string;
  description: string;
  amount: string; // EUR string
  date: string; // yyyy-mm-dd
  supplierId: string;
  paymentMethod: string;
  status: string;
  notes: string;
}

const empty: FormState = {
  type: "income",
  category: "reservation",
  description: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  supplierId: "",
  paymentMethod: "",
  status: "confirmed",
  notes: "",
};

export function TransactionModal({ open, onClose, initial }: TransactionModalProps) {
  const { data: suppliers } = useSuppliers();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    if (initial) {
      setForm({
        type: initial.type,
        category: initial.category,
        description: initial.description,
        amount: (initial.amountCents / 100).toFixed(2),
        date: new Date(initial.date).toISOString().slice(0, 10),
        supplierId: initial.supplierId ?? "",
        paymentMethod: initial.paymentMethod ?? "",
        status: initial.status,
        notes: initial.notes ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [initial, open]);

  function update_(k: keyof FormState, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(form.amount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      toast.error("Importe inválido");
      return;
    }
    if (!form.description.trim()) {
      toast.error("La descripción es obligatoria");
      return;
    }

    const payload = {
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      amountCents: cents,
      date: new Date(form.date).toISOString(),
      supplierId: form.supplierId || null,
      paymentMethod: form.paymentMethod || null,
      status: form.status,
      notes: form.notes.trim() || null,
    } as Partial<Transaction>;

    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, ...payload });
        toast.success("Movimiento actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Movimiento creado");
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
            {initial ? "Editar movimiento" : "Nuevo movimiento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo">
              <select
                value={form.type}
                onChange={(e) => update_("type", e.target.value)}
                className="select-field"
              >
                {TX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Categoría">
              <select
                value={form.category}
                onChange={(e) => update_("category", e.target.value)}
                className="select-field"
              >
                {TX_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Descripción">
            <input
              type="text"
              value={form.description}
              onChange={(e) => update_("description", e.target.value)}
              className="input-field"
              placeholder="Ej: Reserva forfait Baqueira"
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Importe (€)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => update_("amount", e.target.value)}
                className="input-field font-mono"
                required
              />
            </FormField>
            <FormField label="Fecha">
              <input
                type="date"
                value={form.date}
                onChange={(e) => update_("date", e.target.value)}
                className="input-field"
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Proveedor">
              <select
                value={form.supplierId}
                onChange={(e) => update_("supplierId", e.target.value)}
                className="select-field"
              >
                <option value="">— Ninguno —</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Método de pago">
              <select
                value={form.paymentMethod}
                onChange={(e) => update_("paymentMethod", e.target.value)}
                className="select-field"
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Estado">
            <select
              value={form.status}
              onChange={(e) => update_("status", e.target.value)}
              className="select-field"
            >
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </FormField>
          <FormField label="Notas">
            <textarea
              value={form.notes}
              onChange={(e) => update_("notes", e.target.value)}
              className="input-field min-h-20"
              rows={2}
            />
          </FormField>
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
              {initial ? "Guardar cambios" : "Crear movimiento"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
