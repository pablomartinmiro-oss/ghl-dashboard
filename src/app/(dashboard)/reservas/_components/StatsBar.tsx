"use client";

import type { ReservationStats } from "@/hooks/useReservations";
import { getStationLabel } from "./constants";

interface StatsBarProps {
  stats: ReservationStats | undefined;
  loading: boolean;
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading || !stats) {
    return (
      <div className="flex items-center gap-4 rounded-[14px] bg-white px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="h-5 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  const { today, stationCapacity } = stats;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[14px] bg-white px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <span>Hoy:</span>
        <span className="text-green-600">{today.confirmed} confirmadas</span>
        <span className="text-gray-400">|</span>
        <span className="text-red-600">{today.noAvailability} sin disponibilidad</span>
        <span className="text-gray-400">|</span>
        <span className="text-yellow-600">{today.pending} pendientes</span>
        <span className="text-gray-400">|</span>
        <span className="font-semibold">Total: {today.total}</span>
      </div>

      {Object.entries(stationCapacity).length > 0 && (
        <div className="flex items-center gap-3 border-l border-border pl-4 text-xs text-text-secondary">
          {Object.entries(stationCapacity).map(([station, cap]) => (
            <span key={station} className={cap.booked >= cap.max ? "text-red-600 font-medium" : ""}>
              {getStationLabel(station)}: {cap.booked}/{cap.max} cursillos
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
