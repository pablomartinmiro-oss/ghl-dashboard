"use client";

import { cn } from "@/lib/utils";
import type { OpsEvent } from "@/hooks/useOpsEvents";
import {
  HOURS,
  TYPE_BY_VALUE,
  addDays,
  durationToHeightPct,
  isSameDay,
  startOfWeek,
  timeToTopPct,
  WEEKDAYS_ES,
} from "./utils";

interface WeekViewProps {
  weekAnchor: Date;
  events: OpsEvent[];
  onSelectEvent: (ev: OpsEvent) => void;
  onCreateAt: (d: Date) => void;
}

export function WeekView({ weekAnchor, events, onSelectEvent, onCreateAt }: WeekViewProps) {
  const today = new Date();
  const weekStart = startOfWeek(weekAnchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsByDay = new Map<number, OpsEvent[]>();
  for (let i = 0; i < 7; i++) eventsByDay.set(i, []);
  for (const ev of events) {
    const d = new Date(ev.date);
    for (let i = 0; i < 7; i++) {
      if (isSameDay(d, days[i])) {
        eventsByDay.get(i)!.push(ev);
        break;
      }
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-warm-border bg-white">
      <div className="grid min-w-[900px] grid-cols-[64px_repeat(7,minmax(0,1fr))]">
        <div className="border-b border-r border-warm-border" />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center justify-center border-b border-warm-border py-2",
                i < 6 && "border-r"
              )}
            >
              <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                {WEEKDAYS_ES[i]}
              </span>
              <span
                className={cn(
                  "mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  isToday ? "bg-coral text-white" : "text-text-primary"
                )}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}

        <div className="relative">
          {HOURS.map((h) => (
            <div
              key={h}
              className="h-14 border-b border-r border-warm-border pr-1.5 pt-1 text-right text-[10px] font-medium text-text-secondary"
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((d, idx) => {
          const dayEvents = eventsByDay.get(idx) ?? [];
          const totalHeight = HOURS.length * 56; // 14 = h-14 = 3.5rem = 56px
          return (
            <div
              key={idx}
              className={cn(
                "relative",
                idx < 6 && "border-r border-warm-border"
              )}
              style={{ height: `${totalHeight}px` }}
            >
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    const target = new Date(d);
                    target.setHours(h, 0, 0, 0);
                    onCreateAt(target);
                  }}
                  className="block h-14 w-full border-b border-warm-border hover:bg-warm-muted/30"
                  aria-label="Crear evento"
                />
              ))}
              {dayEvents.map((ev) => {
                const meta = TYPE_BY_VALUE[ev.type];
                const top = ev.startTime ? timeToTopPct(ev.startTime) : 0;
                const height = ev.startTime
                  ? durationToHeightPct(ev.startTime, ev.endTime)
                  : 6;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className={cn(
                      "absolute left-1 right-1 z-10 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] font-medium shadow-sm",
                      meta.bg,
                      meta.text
                    )}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      backgroundColor: ev.color ?? undefined,
                    }}
                    title={ev.title}
                  >
                    <div className="truncate">
                      {ev.startTime ?? ""}{" "}
                      <span className="font-semibold">{ev.title}</span>
                    </div>
                    {ev.assignedTo && (
                      <div className="truncate opacity-90">{ev.assignedTo}</div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
