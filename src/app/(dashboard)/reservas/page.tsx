"use client";

import { useState, useMemo } from "react";
import { useReservations, useReservationStats } from "@/hooks/useReservations";
import { StatsBar } from "./_components/StatsBar";
import { ReservationList } from "./_components/ReservationList";
import { ReservationForm } from "./_components/ReservationForm";
import { WeeklyStats } from "./_components/WeeklyStats";

export default function ReservasPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: reservations, isLoading } = useReservations();
  const { data: stats, isLoading: statsLoading } = useReservationStats();

  const lastReservation = useMemo(() => {
    if (!reservations || reservations.length === 0) return null;
    return reservations[0]; // newest first
  }, [reservations]);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
      {/* Live stats bar */}
      <StatsBar stats={stats} loading={statsLoading} />

      {/* Main two-panel layout */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left panel: 35% */}
        <div className="flex w-[35%] flex-col rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <ReservationList
            reservations={reservations}
            loading={isLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <WeeklyStats stats={stats} />
        </div>

        {/* Right panel: 65% */}
        <div className="flex w-[65%] flex-col rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <ReservationForm
            existingReservations={reservations}
            lastReservation={lastReservation}
            onCreated={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
