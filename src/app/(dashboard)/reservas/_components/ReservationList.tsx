"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/hooks/useReservations";
import { STATUS_CONFIG, SOURCE_CONFIG, formatDate, formatEUR, getStationLabel } from "./constants";
import { Badge } from "@/components/ui/badge";

interface ReservationListProps {
  reservations: Reservation[] | undefined;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const DATE_FILTERS = [
  { value: "hoy", label: "Hoy" },
  { value: "manana", label: "Mañana" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "todas", label: "Todas" },
] as const;

const STATUS_FILTERS = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "sin_disponibilidad", label: "Sin disp." },
  { value: "cancelada", label: "Canceladas" },
] as const;

function getDateRange(filter: string): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (filter) {
    case "hoy":
      return { from: today, to: tomorrow };
    case "manana": {
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      return { from: tomorrow, to: dayAfter };
    }
    case "semana": {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
      return { from: today, to: weekEnd };
    }
    case "mes": {
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { from: today, to: monthEnd };
    }
    default:
      return null;
  }
}

export function ReservationList({ reservations, loading, selectedId, onSelect }: ReservationListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [dateFilter, setDateFilter] = useState("hoy");
  const [stationFilter, setStationFilter] = useState("todas");

  const filtered = useMemo(() => {
    if (!reservations) return [];
    let list = reservations;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.clientName.toLowerCase().includes(q) ||
          r.clientEmail.toLowerCase().includes(q) ||
          r.clientPhone.includes(q) ||
          (r.couponCode && r.couponCode.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "todas") {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (stationFilter !== "todas") {
      list = list.filter((r) => r.station === stationFilter);
    }

    const dateRange = getDateRange(dateFilter);
    if (dateRange) {
      list = list.filter((r) => {
        const d = new Date(r.activityDate);
        return d >= dateRange.from && d < dateRange.to;
      });
    }

    return list;
  }, [reservations, search, statusFilter, dateFilter, stationFilter]);

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar reservas..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-cyan"
          />
        </div>
      </div>

      {/* Date filters */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
        {DATE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setDateFilter(f.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              dateFilter === f.value
                ? "bg-cyan text-white"
                : "bg-gray-100 text-text-secondary hover:bg-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Status + station filters */}
      <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              statusFilter === f.value
                ? "bg-cyan text-white"
                : "bg-gray-100 text-text-secondary hover:bg-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="ml-auto rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-secondary"
        >
          <option value="todas">Todas estaciones</option>
          <option value="baqueira">Baqueira</option>
          <option value="sierra_nevada">Sierra Nevada</option>
          <option value="grandvalira">Grandvalira</option>
          <option value="formigal">Formigal</option>
          <option value="alto_campoo">Alto Campoo</option>
          <option value="la_pinilla">La Pinilla</option>
        </select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-text-secondary">
            No se encontraron reservas
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filtered.map((r) => {
              const statusCfg = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pendiente;
              const sourceCfg = SOURCE_CONFIG[r.source as keyof typeof SOURCE_CONFIG];

              return (
                <button
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    selectedId === r.id
                      ? "border-cyan bg-cyan-light"
                      : "border-transparent bg-white hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {sourceCfg && <span className="text-sm">{sourceCfg.icon}</span>}
                        <span className="truncate text-sm font-medium text-text-primary">
                          {r.clientName}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                        <span>{formatDate(r.activityDate)}</span>
                        <span>·</span>
                        <span>{getStationLabel(r.station)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={cn("text-[10px]", statusCfg.color)}>
                        {statusCfg.label}
                      </Badge>
                      <span className="text-xs font-medium text-text-primary">
                        {formatEUR(r.totalPrice)}
                      </span>
                    </div>
                  </div>
                  {r.quoteId && r.quote && (
                    <div className="mt-1 text-[10px] text-cyan">
                      Presupuesto #{r.quote.id.slice(-4).toUpperCase()}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Count */}
      <div className="border-t border-border px-3 py-2 text-xs text-text-secondary">
        {filtered.length} de {reservations?.length ?? 0} reservas
      </div>
    </div>
  );
}
