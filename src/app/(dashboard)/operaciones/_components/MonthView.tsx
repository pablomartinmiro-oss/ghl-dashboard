"use client";

import { cn } from "@/lib/utils";
import type { OpsEvent } from "@/hooks/useOpsEvents";
import {
  buildMonthGrid,
  isSameDay,
  isSameMonth,
  TYPE_BY_VALUE,
  WEEKDAYS_ES,
} from "./utils";

interface MonthViewProps {
  monthAnchor: Date;
  events: OpsEvent[];
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
  onCreateAt: (d: Date) => void;
}

export function MonthView({
  monthAnchor,
  events,
  selectedDate,
  onSelectDate,
  onCreateAt,
}: MonthViewProps) {
  const today = new Date();
  const days = buildMonthGrid(monthAnchor);

  const eventsByDay = new Map<string, OpsEvent[]>();
  for (const ev of events) {
    const d = new Date(ev.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const arr = eventsByDay.get(key);
    if (arr) arr.push(ev);
    else eventsByDay.set(key, [ev]);
  }

  return (
    <div className="rounded-2xl border border-warm-border bg-white">
      <div className="grid grid-cols-7 border-b border-warm-border">
        {WEEKDAYS_ES.map((wd) => (
          <div
            key={wd}
            className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-text-secondary"
          >
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, idx) => {
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayEvents = eventsByDay.get(key) ?? [];
          const isCurrentMonth = isSameMonth(d, monthAnchor);
          const isToday = isSameDay(d, today);
          const isSelected = selectedDate && isSameDay(d, selectedDate);

          return (
            <div
              key={idx}
              className={cn(
                "group relative min-h-[110px] border-b border-r border-warm-border p-1.5",
                idx % 7 === 6 && "border-r-0",
                idx >= 35 && "border-b-0",
                !isCurrentMonth && "bg-warm-muted/40",
                isSelected && "ring-2 ring-coral ring-inset"
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate(d)}
                onDoubleClick={() => onCreateAt(d)}
                className="absolute inset-0 cursor-pointer"
                aria-label={`Día ${d.getDate()}`}
              />
              <div className="relative flex items-start justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                    isToday
                      ? "border border-coral bg-coral text-white"
                      : isCurrentMonth
                        ? "text-text-primary"
                        : "text-text-secondary/60"
                  )}
                >
                  {d.getDate()}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateAt(d);
                  }}
                  className="relative z-10 hidden rounded-full p-0.5 text-text-secondary opacity-0 transition-opacity hover:bg-warm-muted hover:text-coral group-hover:flex group-hover:opacity-100"
                  aria-label="Crear evento"
                >
                  <span className="text-base leading-none">+</span>
                </button>
              </div>
              <div className="relative mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => {
                  const meta = TYPE_BY_VALUE[ev.type];
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        "truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                        meta.bg,
                        meta.text
                      )}
                      title={ev.title}
                      style={ev.color ? { backgroundColor: ev.color } : undefined}
                    >
                      {ev.startTime ? `${ev.startTime} ` : ""}{ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] font-medium text-text-secondary">
                    +{dayEvents.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
