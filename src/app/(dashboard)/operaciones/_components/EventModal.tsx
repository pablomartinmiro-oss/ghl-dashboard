"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDestinations, useSuppliers } from "@/hooks/useWhiteLabel";
import {
  useCreateOpsEvent,
  useUpdateOpsEvent,
  useDeleteOpsEvent,
  type OpsEvent,
  type OpsEventInput,
  type OpsEventStatus,
  type OpsEventType,
} from "@/hooks/useOpsEvents";
import { EVENT_TYPES, STATUS_OPTIONS, toISODate } from "./utils";

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  initial?: OpsEvent | null;
  defaultDate?: Date | null;
  defaultStartTime?: string | null;
}

interface FormState {
  title: string;
  type: OpsEventType;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  destinationId: string;
  supplierId: string;
  assignedTo: string;
  status: OpsEventStatus;
  notes: string;
  color: string;
}

const COLOR_PRESETS = [
  "",
  "#E87B5A",
  "#5B8C6D",
  "#D4A853",
  "#C75D4A",
  "#3B82F6",
  "#8B5CF6",
  "#71717A",
];

const inputClass =
  "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-coral";

function buildEmpty(date: Date | null, startTime: string | null): FormState {
  return {
    title: "",
    type: "pickup",
    date: toISODate(date ?? new Date()),
    startTime: startTime ?? "",
    endTime: "",
    allDay: false,
    destinationId: "",
    supplierId: "",
    assignedTo: "",
    status: "scheduled",
    notes: "",
    color: "",
  };
}

export function EventModal({
  open,
  onClose,
  initial,
  defaultDate,
  defaultStartTime,
}: EventModalProps) {
  const { data: destinations } = useDestinations();
  const { data: suppliers } = useSuppliers();
  const create = useCreateOpsEvent();
  const update = useUpdateOpsEvent();
  const remove = useDeleteOpsEvent();

  const [form, setForm] = useState<FormState>(() =>
    buildEmpty(defaultDate ?? null, defaultStartTime ?? null)
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title,
        type: initial.type,
        date: toISODate(new Date(initial.date)),
        startTime: initial.startTime ?? "",
        endTime: initial.endTime ?? "",
        allDay: initial.allDay,
        destinationId: initial.destinationId ?? "",
        supplierId: initial.supplierId ?? "",
        assignedTo: initial.assignedTo ?? "",
        status: initial.status,
        notes: initial.notes ?? "",
        color: initial.color ?? "",
      });
    } else {
      setForm(buildEmpty(defaultDate ?? null, defaultStartTime ?? null));
    }
  }, [open, initial, defaultDate, defaultStartTime]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (!form.allDay && form.startTime && form.endTime && form.endTime <= form.startTime) {
      toast.error("La hora de fin debe ser posterior a la de inicio");
      return;
    }

    const payload: OpsEventInput = {
      title: form.title.trim(),
      type: form.type,
      date: new Date(`${form.date}T00:00:00`).toISOString(),
      startTime: form.allDay || !form.startTime ? null : form.startTime,
      endTime: form.allDay || !form.endTime ? null : form.endTime,
      allDay: form.allDay,
      destinationId: form.destinationId || null,
      supplierId: form.supplierId || null,
      assignedTo: form.assignedTo.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
      color: form.color || null,
    };

    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, ...payload });
        toast.success("Evento actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Evento creado");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      await remove.mutateAsync(initial.id);
      toast.success("Evento eliminado");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar evento" : "Nuevo evento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Título">
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputClass}
              placeholder="Ej: Recogida material Pérez"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as OpsEventType)}
                className={inputClass}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as OpsEventStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Fecha">
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Inicio">
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className={inputClass}
                disabled={form.allDay}
              />
            </Field>
            <Field label="Fin">
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className={inputClass}
                disabled={form.allDay}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => set("allDay", e.target.checked)}
              className="h-4 w-4 rounded border-warm-border accent-coral"
            />
            Todo el día
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Destino">
              <select
                value={form.destinationId}
                onChange={(e) => set("destinationId", e.target.value)}
                className={inputClass}
              >
                <option value="">— Ninguno —</option>
                {destinations?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Proveedor">
              <select
                value={form.supplierId}
                onChange={(e) => set("supplierId", e.target.value)}
                className={inputClass}
              >
                <option value="">— Ninguno —</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Asignado a">
            <input
              type="text"
              value={form.assignedTo}
              onChange={(e) => set("assignedTo", e.target.value)}
              className={inputClass}
              placeholder="Nombre del responsable"
            />
          </Field>
          <Field label="Notas">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={`${inputClass} min-h-20`}
              rows={2}
            />
          </Field>
          <Field label="Color">
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c || "auto"}
                  type="button"
                  onClick={() => set("color", c)}
                  className={`h-7 w-7 rounded-full border ${
                    form.color === c
                      ? "border-text-primary ring-2 ring-coral"
                      : "border-warm-border"
                  }`}
                  style={{
                    backgroundColor: c || "transparent",
                    backgroundImage: c
                      ? undefined
                      : "repeating-linear-gradient(45deg, #E8E4DE 0 4px, transparent 4px 8px)",
                  }}
                  title={c || "Auto (por tipo)"}
                  aria-label={c || "Color por tipo"}
                />
              ))}
            </div>
          </Field>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {initial && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={remove.isPending}
                  className="rounded-[10px] border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                {initial ? "Guardar cambios" : "Crear evento"}
              </button>
            </div>
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
