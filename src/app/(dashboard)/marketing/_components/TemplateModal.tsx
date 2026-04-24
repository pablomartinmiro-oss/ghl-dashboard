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
  useCreateTemplate,
  useUpdateTemplate,
  type EmailTemplate,
  type TemplateCategory,
} from "@/hooks/useMarketing";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: EmailTemplate | null;
}

interface FormState {
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: string;
  isDefault: boolean;
}

const empty: FormState = {
  name: "",
  subject: "",
  body: "",
  category: "",
  variables: "nombre,destino,fecha",
  isDefault: false,
};

const INPUT_CLS =
  "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral/30";

const VARIABLE_LABELS: Record<string, string> = {
  nombre: "Nombre del cliente",
  destino: "Destino",
  fecha: "Fecha",
  codigo: "Código de promoción",
  total: "Importe total",
};

export function TemplateModal({ open, onClose, initial }: Props) {
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        subject: initial.subject,
        body: initial.body,
        category: initial.category ?? "",
        variables: (initial.variables ?? [])
          .map((v) => v.key)
          .join(","),
        isDefault: initial.isDefault,
      });
    } else {
      setForm(empty);
    }
  }, [initial, open]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function insertVariable(key: string) {
    set("body", form.body + `{{${key}}}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast.error("Nombre, asunto y cuerpo son obligatorios");
      return;
    }

    const variables = form.variables
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .map((k) => ({ key: k, label: VARIABLE_LABELS[k] ?? k }));

    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      body: form.body,
      category: (form.category || null) as TemplateCategory | null,
      variables,
      isDefault: form.isDefault,
    };

    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, ...payload });
        toast.success("Plantilla actualizada");
      } else {
        await create.mutateAsync(payload);
        toast.success("Plantilla creada");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  const variableKeys = form.variables
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar plantilla" : "Nueva plantilla"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre">
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={INPUT_CLS}
                required
              />
            </Field>
            <Field label="Categoría">
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">—</option>
                <option value="promotional">Promocional</option>
                <option value="transactional">Transaccional</option>
                <option value="newsletter">Newsletter</option>
                <option value="welcome">Bienvenida</option>
                <option value="reminder">Recordatorio</option>
              </select>
            </Field>
          </div>
          <Field label="Asunto">
            <input
              value={form.subject}
              onChange={(e) => set("subject", e.target.value)}
              className={INPUT_CLS}
              placeholder="Tu próximo viaje a {{destino}} te espera"
              required
            />
          </Field>
          <Field label="Variables (separadas por coma)">
            <input
              value={form.variables}
              onChange={(e) => set("variables", e.target.value)}
              className={INPUT_CLS}
              placeholder="nombre,destino,fecha"
            />
          </Field>
          {variableKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-text-secondary">Insertar:</span>
              {variableKeys.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => insertVariable(k)}
                  className="rounded-full bg-warm-muted px-2 py-0.5 font-mono text-xs text-text-primary hover:bg-coral/10 hover:text-coral"
                >
                  {`{{${k}}}`}
                </button>
              ))}
            </div>
          )}
          <Field label="Cuerpo">
            <textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              className={`${INPUT_CLS} min-h-48 font-mono text-xs`}
              rows={10}
              placeholder="Hola {{nombre}}, tenemos una oferta especial..."
              required
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => set("isDefault", e.target.checked)}
              className="h-4 w-4 rounded border-warm-border text-coral focus:ring-coral"
            />
            Marcar como plantilla predeterminada
          </label>
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
              {initial ? "Guardar cambios" : "Crear plantilla"}
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
