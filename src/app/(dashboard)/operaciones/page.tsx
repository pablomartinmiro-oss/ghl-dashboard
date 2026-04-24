"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useOpsEvents,
  useUpdateOpsEvent,
  useDeleteOpsEvent,
  type OpsEvent,
  type OpsEventStatus,
} from "@/hooks/useOpsEvents";
import { useDestinations } from "@/hooks/useWhiteLabel";
import { MonthView } from "./_components/MonthView";
import { WeekView } from "./_components/WeekView";
import { DayView } from "./_components/DayView";
import { EventModal } from "./_components/EventModal";
import {
  EVENT_TYPES,
  MONTHS_ES,
  STATUS_OPTIONS,
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "./_components/utils";
import type { CalendarView } from "./_components/utils";
import { cn } from "@/lib/utils";

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Día" },
];

export default function OperacionesPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [destinationId, setDestinationId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OpsEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [defaultStartTime, setDefaultStartTime] = useState<string | null>(null);

  const { data: destinations } = useDestinations();
  const updateEvent = useUpdateOpsEvent();
  const deleteEvent = useDeleteOpsEvent();

  const { from, to } = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(anchor);
      const monthEnd = endOfMonth(anchor);
      return {
        from: startOfWeek(monthStart).toISOString(),
        to: endOfWeek(monthEnd).toISOString(),
      };
    }
    if (view === "week") {
      return {
        from: startOfWeek(anchor).toISOString(),
        to: endOfWeek(anchor).toISOString(),
      };
    }
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    return { from: dayStart.toISOString(), to: dayEnd.toISOString() };
  }, [view, anchor, selectedDate]);

  const { data: events = [] } = useOpsEvents({
    from,
    to,
    destinationId: destinationId || undefined,
    status: statusFilter || undefined,
  });

  const filteredEvents = useMemo(() => {
    if (typeFilters.size === 0) return events;
    return events.filter((e) => typeFilters.has(e.type));
  }, [events, typeFilters]);

  const headerLabel = useMemo(() => {
    if (view === "month") {
      return `${MONTHS_ES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
    if (view === "week") {
      const s = startOfWeek(anchor);
      const e = endOfWeek(anchor);
      const sameMonth = s.getMonth() === e.getMonth();
      return sameMonth
        ? `${s.getDate()} – ${e.getDate()} ${MONTHS_ES[e.getMonth()]} ${e.getFullYear()}`
        : `${s.getDate()} ${MONTHS_ES[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS_ES[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
    }
    return `${selectedDate.getDate()} ${MONTHS_ES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }, [view, anchor, selectedDate]);

  function navigate(dir: -1 | 1) {
    if (view === "month") setAnchor((a) => addMonths(a, dir));
    else if (view === "week") setAnchor((a) => addDays(a, dir * 7));
    else setSelectedDate((d) => addDays(d, dir));
  }

  function goToday() {
    const t = new Date();
    setAnchor(t);
    setSelectedDate(t);
  }

  function toggleType(value: string) {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function openCreate(d?: Date, time?: string) {
    setEditing(null);
    setDefaultDate(d ?? selectedDate);
    setDefaultStartTime(time ?? null);
    setModalOpen(true);
  }

  function openEdit(ev: OpsEvent) {
    setEditing(ev);
    setDefaultDate(null);
    setDefaultStartTime(null);
    setModalOpen(true);
  }

  async function handleStatusChange(ev: OpsEvent, status: OpsEventStatus) {
    try {
      await updateEvent.mutateAsync({ id: ev.id, status });
      toast.success("Estado actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  async function handleDelete(ev: OpsEvent) {
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      await deleteEvent.mutateAsync(ev.id);
      toast.success("Evento eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  function handleSelectDate(d: Date) {
    setSelectedDate(d);
    if (isSameDay(d, selectedDate) && view === "month") {
      setView("day");
    }
  }

  function handleWeekCreate(d: Date) {
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    openCreate(d, time);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Operaciones
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">Calendario operativo</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" />
          Nuevo evento
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-warm-border bg-white p-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-1 rounded-[10px] border border-warm-border p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors",
                view === v.value
                  ? "bg-coral text-white"
                  : "text-text-secondary hover:bg-warm-muted hover:text-text-primary"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="rounded-[10px] border border-warm-border bg-white p-1.5 text-text-secondary hover:bg-warm-muted"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="rounded-[10px] border border-warm-border bg-white px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-warm-muted"
          >
            Hoy
          </button>
          <button
            onClick={() => navigate(1)}
            className="rounded-[10px] border border-warm-border bg-white p-1.5 text-text-secondary hover:bg-warm-muted"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="text-sm font-medium text-text-primary">{headerLabel}</div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <select
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Todos los destinos</option>
            {destinations?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-text-secondary">Tipos:</span>
        {EVENT_TYPES.map((t) => {
          const active = typeFilters.size === 0 || typeFilters.has(t.value);
          return (
            <button
              key={t.value}
              onClick={() => toggleType(t.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-warm-border bg-white text-text-primary"
                  : "border-warm-border bg-warm-muted/40 text-text-secondary opacity-50"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", t.dot)} />
              {t.label}
            </button>
          );
        })}
        {typeFilters.size > 0 && (
          <button
            onClick={() => setTypeFilters(new Set())}
            className="text-xs font-medium text-coral hover:underline"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Active view */}
      {view === "month" && (
        <MonthView
          monthAnchor={anchor}
          events={filteredEvents}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onCreateAt={(d) => openCreate(d)}
        />
      )}
      {view === "week" && (
        <WeekView
          weekAnchor={anchor}
          events={filteredEvents}
          onSelectEvent={openEdit}
          onCreateAt={handleWeekCreate}
        />
      )}
      {view === "day" && (
        <DayView
          date={selectedDate}
          events={filteredEvents}
          onEdit={openEdit}
          onDelete={handleDelete}
          onChangeStatus={handleStatusChange}
          onCreate={() => openCreate(selectedDate)}
        />
      )}

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        defaultDate={defaultDate}
        defaultStartTime={defaultStartTime}
      />
    </div>
  );
}
