"use client";

import { cn } from "@/lib/utils";
import { Pencil, Trash2, CheckCircle2, Play, XCircle } from "lucide-react";
import type { OpsEvent, OpsEventStatus } from "@/hooks/useOpsEvents";
import {
  TYPE_BY_VALUE,
  STATUS_BY_VALUE,
  formatDateLong,
  isSameDay,
} from "./utils";

interface DayViewProps {
  date: Date;
  events: OpsEvent[];
  onEdit: (ev: OpsEvent) => void;
  onDelete: (ev: OpsEvent) => void;
  onChangeStatus: (ev: OpsEvent, status: OpsEventStatus) => void;
  onCreate: () => void;
}

const STATUS_CYCLE: OpsEventStatus[] = ["scheduled", "in_progress", "completed"];

export function DayView({
  date,
  events,
  onEdit,
  onDelete,
  onChangeStatus,
  onCreate,
}: DayViewProps) {
  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.date), date))
    .sort((a, b) => {
      const at = a.startTime ?? "00:00";
      const bt = b.startTime ?? "00:00";
      return at.localeCompare(bt);
    });

  return (
    <div className="rounded-2xl border border-warm-border bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {formatDateLong(date)}
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          + Nuevo evento
        </button>
      </div>

      {dayEvents.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-warm-border p-8 text-center text-sm text-text-secondary">
          No hay eventos programados para este día.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {dayEvents.map((ev) => {
            const meta = TYPE_BY_VALUE[ev.type];
            const status = STATUS_BY_VALUE[ev.status];
            const nextStatus = nextStatusFor(ev.status);
            return (
              <div
                key={ev.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-l-4 border border-warm-border bg-warm-muted/20 p-3",
                  meta.border
                )}
                style={ev.color ? { borderLeftColor: ev.color } : undefined}
              >
                <div className="w-16 shrink-0 text-xs font-medium text-text-secondary">
                  {ev.allDay
                    ? "Todo el día"
                    : ev.startTime
                      ? `${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ""}`
                      : "Sin hora"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        meta.bg,
                        meta.text
                      )}
                    >
                      {meta.label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        status.chip
                      )}
                    >
                      {status.label}
                    </span>
                    <h4 className="text-sm font-semibold text-text-primary">
                      {ev.title}
                    </h4>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                    {ev.destination && <span>📍 {ev.destination.name}</span>}
                    {ev.supplier && <span>🏷 {ev.supplier.name}</span>}
                    {ev.assignedTo && <span>👤 {ev.assignedTo}</span>}
                  </div>
                  {ev.notes && (
                    <p className="mt-1.5 text-xs text-text-secondary">{ev.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {nextStatus && (
                    <button
                      type="button"
                      onClick={() => onChangeStatus(ev, nextStatus)}
                      title={`Marcar como ${STATUS_BY_VALUE[nextStatus].label}`}
                      className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-emerald-600"
                    >
                      {nextStatus === "in_progress" ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  {ev.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => onChangeStatus(ev, "cancelled")}
                      title="Cancelar"
                      className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-stone-600"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(ev)}
                    title="Editar"
                    className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(ev)}
                    title="Eliminar"
                    className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function nextStatusFor(s: OpsEventStatus): OpsEventStatus | null {
  const idx = STATUS_CYCLE.indexOf(s);
  if (idx < 0) return null;
  return STATUS_CYCLE[idx + 1] ?? null;
}

