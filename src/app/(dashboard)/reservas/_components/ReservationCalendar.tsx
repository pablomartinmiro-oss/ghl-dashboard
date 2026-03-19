"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/hooks/useReservations";

interface Props {
  reservations: Reservation[];
  month: Date;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onMonthChange: (d: Date) => void;
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Mon = 0 … Sun = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function ReservationCalendar({
  reservations,
  month,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: Props) {
  const year = month.getFullYear();
  const monthIdx = month.getMonth();

  const dayMap = useMemo(() => {
    const map: Record<string, { confirmed: number; pending: number; unavailable: number }> = {};
    for (const r of reservations) {
      const d = new Date(r.activityDate);
      const key = toDateKey(d);
      if (!map[key]) map[key] = { confirmed: 0, pending: 0, unavailable: 0 };
      if (r.status === "confirmada") map[key].confirmed++;
      else if (r.status === "pendiente") map[key].pending++;
      else if (r.status === "sin_disponibilidad") map[key].unavailable++;
    }
    return map;
  }, [reservations]);

  const grid = useMemo(() => buildGrid(year, monthIdx), [year, monthIdx]);
  const todayKey = toDateKey(new Date());

  function prevMonth() {
    onMonthChange(new Date(year, monthIdx - 1, 1));
  }

  function nextMonth() {
    onMonthChange(new Date(year, monthIdx + 1, 1));
  }

  function handleDayClick(day: number) {
    const key = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onSelectDate(key === selectedDate ? null : key);
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="rounded-lg p-1.5 hover:bg-[#FAF9F7] text-[#8A8580] hover:text-[#2D2A26] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-[#2D2A26]">
          {MONTH_NAMES[monthIdx]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="rounded-lg p-1.5 hover:bg-[#FAF9F7] text-[#8A8580] hover:text-[#2D2A26] transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium text-[#8A8580]">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1 gap-y-1">
        {grid.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const key = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const counts = dayMap[key];
          const total = counts ? counts.confirmed + counts.pending + counts.unavailable : 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;

          return (
            <button
              key={key}
              onClick={() => handleDayClick(day)}
              className={cn(
                "relative flex flex-col items-center rounded-xl py-1.5 px-0.5 transition-colors hover:bg-[#FAF9F7]",
                isSelected && "bg-[#E87B5A]/10 ring-1 ring-[#E87B5A]/40",
                isToday && !isSelected && "bg-[#FAF9F7]"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday
                    ? "bg-[#E87B5A] font-semibold text-white"
                    : isSelected
                    ? "font-semibold text-[#E87B5A]"
                    : "text-[#2D2A26]"
                )}
              >
                {day}
              </span>

              {total > 0 && (
                <>
                  {/* Count badge */}
                  <span className="mt-0.5 text-[9px] font-medium text-[#8A8580]">
                    {total}
                  </span>
                  {/* Color dots */}
                  <div className="mt-0.5 flex gap-0.5">
                    {counts!.confirmed > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#5B8C6D]" />
                    )}
                    {counts!.pending > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D4A853]" />
                    )}
                    {counts!.unavailable > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C75D4A]" />
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 border-t border-[#E8E4DE] pt-3">
        <div className="flex items-center gap-1.5 text-[10px] text-[#8A8580]">
          <span className="h-2 w-2 rounded-full bg-[#5B8C6D]" /> Confirmada
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#8A8580]">
          <span className="h-2 w-2 rounded-full bg-[#D4A853]" /> Pendiente
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#8A8580]">
          <span className="h-2 w-2 rounded-full bg-[#C75D4A]" /> Sin disp.
        </div>
      </div>
    </div>
  );
}
