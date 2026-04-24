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
  useCreateSafetyDocument,
  useUpdateSafetyDocument,
  type DocCategory,
  type DocStatus,
  type DocType,
  type SafetyDocument,
} from "@/hooks/useREAV";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: SafetyDocument | null;
}

interface FormState {
  type: DocType;
  title: string;
  description: string;
  validFrom: string;
  validUntil: string;
  status: DocStatus;
  category: string;
  assignedTo: string;
}

const empty: FormState = {
  type: "safety_protocol",
  title: "",
  description: "",
  validFrom: "",
  validUntil: "",
  status: "draft",
  category: "",
  assignedTo: "",
};

const INPUT_CLS =
  "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral/30";

const TYPES: { v: DocType; l: string }[] = [
  { v: "risk_assessment", l: "Evaluación de riesgos" },
  { v: "emergency_plan", l: "Plan de emergencia" },
  { v: "safety_protocol", l: "Protocolo de seguridad" },
  { v: "insurance_cert", l: "Certificado de seguro" },
  { v: "instructor_cert", l: "Certificado instructor" },
  { v: "equipment_check", l: "Revisión de equipos" },
  { v: "incident_report", l: "Informe de incidente" },
  { v: "other", l: "Otro" },
];

const CATEGORIES: { v: DocCategory; l: string }[] = [
  { v: "general", l: "General" },
  { v: "snow", l: "Nieve" },
  { v: "mountain", l: "Montaña" },
  { v: "water", l: "Agua" },
  { v: "equipment", l: "Equipamiento" },
];

function toDateInput(v: string | null): string {
  return v ? v.slice(0, 10) : "";
}

export function DocumentModal({ open, onClose, initial }: Props) {
  const create = useCreateSafetyDocument();
  const update = useUpdateSafetyDocument();
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    if (initial) {
      setForm({
        type: initial.type,
        title: initial.title,
        description: initial.description ?? "",
        validFrom: toDateInput(initial.validFrom),
        validUntil: toDateInput(initial.validUntil),
        status: initial.status,
        category: initial.category ?? "",
        assignedTo: initial.assignedTo ?? "",
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
    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    const payload = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
      validUntil: form.validUntil
        ? new Date(form.validUntil).toISOString()
        : null,
      status: form.status,
      category: (form.category || null) as DocCategory | null,
      assignedTo: form.assignedTo.trim() || null,
    };
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, ...payload });
        toast.success("Documento actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Documento creado");
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
            {initial ? "Editar documento" : "Nuevo documento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as DocType)}
                className={INPUT_CLS}
              >
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>{t.l}</option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as DocStatus)}
                className={INPUT_CLS}
              >
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="expired">Expirado</option>
                <option value="archived">Archivado</option>
              </select>
            </Field>
          </div>
          <Field label="Título">
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={INPUT_CLS}
              required
            />
          </Field>
          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={`${INPUT_CLS} min-h-20`}
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Válido desde">
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => set("validFrom", e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Válido hasta">
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">—</option>
                {CATEGORIES.map((c) => (
                  <option key={c.v} value={c.v}>{c.l}</option>
                ))}
              </select>
            </Field>
            <Field label="Asignado a">
              <input
                value={form.assignedTo}
                onChange={(e) => set("assignedTo", e.target.value)}
                className={INPUT_CLS}
                placeholder="Nombre o equipo"
              />
            </Field>
          </div>
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
              {initial ? "Guardar cambios" : "Crear documento"}
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
