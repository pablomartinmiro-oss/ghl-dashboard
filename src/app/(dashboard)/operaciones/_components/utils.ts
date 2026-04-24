import type { OpsEventStatus, OpsEventType } from "@/hooks/useOpsEvents";

export type CalendarView = "month" | "week" | "day";

export interface TypeMeta {
  value: OpsEventType;
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const EVENT_TYPES: TypeMeta[] = [
  { value: "pickup", label: "Recogida", bg: "bg-blue-500", text: "text-white", border: "border-blue-500", dot: "bg-blue-500" },
  { value: "dropoff", label: "Devolución", bg: "bg-indigo-500", text: "text-white", border: "border-indigo-500", dot: "bg-indigo-500" },
  { value: "transfer", label: "Traslado", bg: "bg-amber-500", text: "text-white", border: "border-amber-500", dot: "bg-amber-500" },
  { value: "lesson", label: "Clase", bg: "bg-emerald-600", text: "text-white", border: "border-emerald-600", dot: "bg-emerald-600" },
  { value: "activity", label: "Actividad", bg: "bg-coral", text: "text-white", border: "border-coral", dot: "bg-coral" },
  { value: "staff", label: "Personal", bg: "bg-purple-500", text: "text-white", border: "border-purple-500", dot: "bg-purple-500" },
  { value: "maintenance", label: "Mantenimiento", bg: "bg-zinc-500", text: "text-white", border: "border-zinc-500", dot: "bg-zinc-500" },
  { value: "other", label: "Otro", bg: "bg-stone-500", text: "text-white", border: "border-stone-500", dot: "bg-stone-500" },
];

export const TYPE_BY_VALUE: Record<OpsEventType, TypeMeta> = EVENT_TYPES.reduce(
  (acc, t) => {
    acc[t.value] = t;
    return acc;
  },
  {} as Record<OpsEventType, TypeMeta>
);

export const STATUS_OPTIONS: { value: OpsEventStatus; label: string; chip: string }[] = [
  { value: "scheduled", label: "Programado", chip: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "in_progress", label: "En curso", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "completed", label: "Completado", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "cancelled", label: "Cancelado", chip: "bg-stone-100 text-stone-600 border-stone-200" },
];

export const STATUS_BY_VALUE: Record<OpsEventStatus, { label: string; chip: string }> =
  STATUS_OPTIONS.reduce(
    (acc, s) => {
      acc[s.value] = { label: s.label, chip: s.chip };
      return acc;
    },
    {} as Record<OpsEventStatus, { label: string; chip: string }>
  );

export const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8:00 - 20:00
export const DAY_HOUR_START = 8;
export const DAY_HOUR_END = 20;

export const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Monday = 0, Sunday = 6 */
function dayIndexMon(d: Date): number {
  const js = d.getDay(); // 0 = Sun
  return (js + 6) % 7;
}

export function startOfWeek(d: Date): Date {
  const idx = dayIndexMon(d);
  const r = new Date(d);
  r.setDate(d.getDate() - idx);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(d.getMonth() + n);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateLong(d: Date): string {
  const wd = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][d.getDay()];
  return `${wd}, ${d.getDate()} de ${MONTHS_ES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}

/** Six-week grid (42 days) starting Monday before/on the 1st of the month */
export function buildMonthGrid(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** Top offset (in % of column height) for a HH:MM time */
export function timeToTopPct(hhmm: string | null): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h - DAY_HOUR_START) * 60 + (m ?? 0);
  const span = (DAY_HOUR_END - DAY_HOUR_START) * 60;
  return Math.max(0, Math.min(100, (total / span) * 100));
}

export function durationToHeightPct(start: string | null, end: string | null): number {
  if (!start) return 4;
  const [sh, sm] = start.split(":").map(Number);
  const startMin = sh * 60 + (sm ?? 0);
  let endMin = startMin + 60;
  if (end) {
    const [eh, em] = end.split(":").map(Number);
    endMin = eh * 60 + (em ?? 0);
  }
  const span = (DAY_HOUR_END - DAY_HOUR_START) * 60;
  const dur = Math.max(15, endMin - startMin);
  return Math.max(2, Math.min(100, (dur / span) * 100));
}
