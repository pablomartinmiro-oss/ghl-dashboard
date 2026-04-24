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
  useUpsertREAVRegistry,
  type REAVRegistry,
  type RegistryStatus,
} from "@/hooks/useREAV";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: REAVRegistry | null;
}

interface FormState {
  registryNumber: string;
  communityCode: string;
  companyName: string;
  cif: string;
  registeredAt: string;
  expiresAt: string;
  status: RegistryStatus;
  insurancePolicy: string;
  insuranceExpiry: string;
  civilLiability: string;
  notes: string;
}

const empty: FormState = {
  registryNumber: "",
  communityCode: "",
  companyName: "",
  cif: "",
  registeredAt: "",
  expiresAt: "",
  status: "pending",
  insurancePolicy: "",
  insuranceExpiry: "",
  civilLiability: "",
  notes: "",
};

const INPUT_CLS =
  "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral/30";

function toDateInput(v: string | null): string {
  if (!v) return "";
  return v.slice(0, 10);
}

export function RegistryModal({ open, onClose, initial }: Props) {
  const upsert = useUpsertREAVRegistry();
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    if (initial) {
      setForm({
        registryNumber: initial.registryNumber ?? "",
        communityCode: initial.communityCode ?? "",
        companyName: initial.companyName,
        cif: initial.cif ?? "",
        registeredAt: toDateInput(initial.registeredAt),
        expiresAt: toDateInput(initial.expiresAt),
        status: initial.status,
        insurancePolicy: initial.insurancePolicy ?? "",
        insuranceExpiry: toDateInput(initial.insuranceExpiry),
        civilLiability:
          initial.civilLiability !== null ? String(initial.civilLiability) : "",
        notes: initial.notes ?? "",
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
    if (!form.companyName.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }
    try {
      await upsert.mutateAsync({
        registryNumber: form.registryNumber.trim() || null,
        communityCode: form.communityCode.trim() || null,
        companyName: form.companyName.trim(),
        cif: form.cif.trim() || null,
        registeredAt: form.registeredAt
          ? new Date(form.registeredAt).toISOString()
          : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        status: form.status,
        insurancePolicy: form.insurancePolicy.trim() || null,
        insuranceExpiry: form.insuranceExpiry
          ? new Date(form.insuranceExpiry).toISOString()
          : null,
        civilLiability: form.civilLiability
          ? Number(form.civilLiability)
          : null,
        notes: form.notes.trim() || null,
      });
      toast.success("Registro actualizado");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registro REAV</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Empresa (razón social)">
            <input
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              className={INPUT_CLS}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nº Registro REAV">
              <input
                value={form.registryNumber}
                onChange={(e) => set("registryNumber", e.target.value)}
                className={INPUT_CLS}
                placeholder="AV-CAT-1234"
              />
            </Field>
            <Field label="Comunidad autónoma">
              <input
                value={form.communityCode}
                onChange={(e) => set("communityCode", e.target.value)}
                className={INPUT_CLS}
                placeholder="CAT, MAD..."
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CIF">
              <input
                value={form.cif}
                onChange={(e) => set("cif", e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as RegistryStatus)}
                className={INPUT_CLS}
              >
                <option value="pending">Pendiente</option>
                <option value="active">Activo</option>
                <option value="expired">Expirado</option>
                <option value="suspended">Suspendido</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de registro">
              <input
                type="date"
                value={form.registeredAt}
                onChange={(e) => set("registeredAt", e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Fecha de vencimiento">
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Póliza de seguro">
              <input
                value={form.insurancePolicy}
                onChange={(e) => set("insurancePolicy", e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Vencimiento seguro">
              <input
                type="date"
                value={form.insuranceExpiry}
                onChange={(e) => set("insuranceExpiry", e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
          </div>
          <Field label="RC cubierta (€)">
            <input
              type="number"
              min="0"
              step="1000"
              value={form.civilLiability}
              onChange={(e) => set("civilLiability", e.target.value)}
              className={`${INPUT_CLS} font-mono`}
            />
          </Field>
          <Field label="Notas">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={`${INPUT_CLS} min-h-16`}
              rows={2}
            />
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
              disabled={upsert.isPending}
              className="rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
