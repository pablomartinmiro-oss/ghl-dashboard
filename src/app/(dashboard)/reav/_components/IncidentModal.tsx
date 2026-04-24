"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDestinations } from "@/hooks/useWhiteLabel";
import {
  useCreateIncident,
  useUpdateIncident,
  type IncidentReport,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/hooks/useREAV";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: IncidentReport | null;
}

interface FormState {
  date: string;
  location: string;
  destinationId: string;
  severity: IncidentSeverity;
  description: string;
  personsInvolved: string;
  actionsTaken: string;
  followUp: string;
  reportedBy: string;
  status: IncidentStatus;
  resolution: string;
}

function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const empty: FormState = {
  date: nowLocal(),
  location: "",
  destinationId: "",
  severity: "minor",
  description: "",
  personsInvolved: "",
  actionsTaken: "",
  followUp: "",
  reportedBy: "",
  status: "open",
  resolution: "",
};

const INPUT_CLS =
  "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral/30";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function IncidentModal({ open, onClose, initial }: Props) {
  const { data: destinations } = useDestinations();
  const create = useCreateIncident();
  const update = useUpdateIncident();
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    if (initial) {
      setForm({
        date: toLocalInput(initial.date),
        location: initial.location,
        destinationId: initial.destinationId ?? "",
        severity: initial.severity,
        description: initial.description,
        personsInvolved: initial.personsInvolved ?? "",
        actionsTaken: initial.actionsTaken ?? "",
        followUp: initial.followUp ?? "",
        reportedBy: initial.reportedBy,
        status: initial.status,
        resolution: initial.resolution ?? "",
      });
    } else {
      setForm({ ...empty, date: nowLocal() });
    }
  }, [initial, open]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.location.trim()) {
      toast.error("La ubicación es obligatoria");
      return;
    }
    if (!form.description.trim()) {
      toast.error("La descripción es obligatoria");
      return;
    }
    if (!form.reportedBy.trim()) {
      toast.error("Indica quién lo reporta");
      return;
    }

    const payload = {
      date: new Date(form.date).toISOString(),
      location: form.location.trim(),
      destinationId: form.destinationId || null,
      severity: form.severity,
      description: form.description.trim(),
      personsInvolved: form.personsInvolved.trim() || null,
      actionsTaken: form.actionsTaken.trim() || null,
      followUp: form.followUp.trim() || null,
      reportedBy: form.reportedBy.trim(),
      status: form.status,
    };

    try {
      if (initial) {
        await update.mutateAsync({
          id: initial.id,
          ...payload,
          resolution: form.resolution.trim() || null,
        });
        toast.success("Incidente actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Incidente reportado");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar incidente" : "Reportar incidente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha y hora">
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={INPUT_CLS}
                required
              />
            </Field>
            <Field label="Severidad">
              <select
                value={form.severity}
                onChange={(e) => set("severity", e.target.value as IncidentSeverity)}
                className={INPUT_CLS}
              >
                <option value="minor">Leve</option>
                <option value="moderate">Moderada</option>
                <option value="serious">Grave</option>
                <option value="critical">Crítica</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ubicación">
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className={INPUT_CLS}
                placeholder="Pista, zona, edificio..."
                required
              />
            </Field>
            <Field label="Destino">
              <select
                value={form.destinationId}
                onChange={(e) => set("destinationId", e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">— Ninguno —</option>
                {destinations?.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={`${INPUT_CLS} min-h-24`}
              rows={4}
              required
            />
          </Field>
          <Field label="Personas implicadas">
            <input
              value={form.personsInvolved}
              onChange={(e) => set("personsInvolved", e.target.value)}
              className={INPUT_CLS}
              placeholder="Nombres, edades, contacto..."
            />
          </Field>
          <Field label="Acciones tomadas">
            <textarea
              value={form.actionsTaken}
              onChange={(e) => set("actionsTaken", e.target.value)}
              className={`${INPUT_CLS} min-h-16`}
              rows={2}
            />
          </Field>
          <Field label="Seguimiento">
            <textarea
              value={form.followUp}
              onChange={(e) => set("followUp", e.target.value)}
              className={`${INPUT_CLS} min-h-16`}
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reportado por">
              <input
                value={form.reportedBy}
                onChange={(e) => set("reportedBy", e.target.value)}
                className={INPUT_CLS}
                required
              />
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as IncidentStatus)}
                className={INPUT_CLS}
              >
                <option value="open">Abierto</option>
                <option value="investigating">Investigando</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
              </select>
            </Field>
          </div>
          {initial && (
            <Field label="Resolución">
              <textarea
                value={form.resolution}
                onChange={(e) => set("resolution", e.target.value)}
                className={`${INPUT_CLS} min-h-16`}
                rows={2}
              />
            </Field>
          )}
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
              {initial ? "Guardar cambios" : "Reportar"}
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
