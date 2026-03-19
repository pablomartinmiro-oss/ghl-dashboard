"use client";

import { useState } from "react";
import { Search, MapPin, Calendar, Users, Clock, FormInput } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Quote } from "@/hooks/useQuotes";
import { STATIONS } from "../../reservas/_components/constants";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  nuevo: { label: "Nuevo", color: "bg-soft-blue-light text-soft-blue" },
  borrador: { label: "Borrador", color: "bg-soft-blue-light text-soft-blue" },
  en_proceso: { label: "En Proceso", color: "bg-gold-light text-gold" },
  enviado: { label: "Enviado", color: "bg-sage-light text-sage" },
  pagado: { label: "Pagado", color: "bg-sage text-white" },
  expirado: { label: "Expirado", color: "bg-red-100 text-red-600" },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-500" },
};

function getStationLabel(value: string): string {
  return STATIONS.find((s) => s.value === value)?.label ?? value;
}

interface QuoteListProps {
  quotes: Quote[];
  selectedId: string | null;
  onSelect: (quote: Quote) => void;
}

export function QuoteList({ quotes, selectedId, onSelect }: QuoteListProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDestination, setFilterDestination] = useState<string>("");

  const filtered = quotes.filter((q) => {
    if (search) {
      const s = search.toLowerCase();
      const matchName = q.clientName?.toLowerCase().includes(s);
      const matchEmail = q.clientEmail?.toLowerCase().includes(s);
      const matchPhone = q.clientPhone?.includes(s);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    if (filterStatus && q.status !== filterStatus) return false;
    if (filterDestination && q.destination !== filterDestination) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm placeholder:text-text-secondary focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>

        {/* Filters */}
        <div className="mt-3 flex gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs focus:border-coral focus:outline-none"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs focus:border-coral focus:outline-none"
          >
            <option value="">Todos los destinos</option>
            {STATIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Status count pills */}
        <StatusCountBar quotes={quotes} activeStatus={filterStatus} onSelect={setFilterStatus} />
      </div>

      {/* Quote cards */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-secondary">
            No se encontraron presupuestos
          </div>
        ) : (
          filtered.map((quote) => {
            const config = STATUS_CONFIG[quote.status] || STATUS_CONFIG.nuevo;
            const isSelected = selectedId === quote.id;
            const totalPax = quote.adults + quote.children;

            return (
              <button
                key={quote.id}
                onClick={() => onSelect(quote)}
                className={cn(
                  "w-full border-b border-warm-border p-4 text-left transition-colors hover:bg-warm-muted/50",
                  isSelected && "bg-warm-muted border-l-[3px] border-l-coral"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-medium text-sm text-text-primary">
                      {quote.clientName}
                    </h3>
                    {quote.source === "survey" && (
                      <span className="flex items-center gap-0.5 rounded-full bg-soft-blue-light px-1.5 py-0.5 text-[10px] font-medium text-soft-blue">
                        <FormInput className="h-2.5 w-2.5" /> Formulario
                      </span>
                    )}
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", config.color)}>
                    {config.label}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {getStationLabel(quote.destination)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(quote.checkIn)} - {formatDate(quote.checkOut)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {totalPax} pax
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      {new Date(quote.createdAt).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {quote.status === "enviado" && quote.expiresAt && <ExpiryBadge expiresAt={quote.expiresAt} />}
                  </div>
                  {quote.totalAmount > 0 && (
                    <span className="text-sm font-semibold text-text-primary">
                      {quote.totalAmount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);

  if (diffDays < 0) {
    return <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600"><Clock className="h-2.5 w-2.5" /> Expirado</span>;
  }
  if (diffDays <= 2) {
    return <span className="flex items-center gap-0.5 rounded-full bg-gold-light px-1.5 py-0.5 text-[10px] font-medium text-gold"><Clock className="h-2.5 w-2.5" /> {diffDays}d</span>;
  }
  return <span className="flex items-center gap-0.5 text-[10px] text-text-secondary"><Clock className="h-2.5 w-2.5" /> {diffDays}d</span>;
}

function StatusCountBar({ quotes, activeStatus, onSelect }: {
  quotes: Quote[];
  activeStatus: string;
  onSelect: (s: string) => void;
}) {
  const counts = Object.keys(STATUS_CONFIG).map((key) => ({
    key,
    count: quotes.filter((q) => q.status === key).length,
    config: STATUS_CONFIG[key],
  })).filter((s) => s.count > 0);

  if (counts.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {counts.map(({ key, count, config }) => (
        <button
          key={key}
          onClick={() => onSelect(activeStatus === key ? "" : key)}
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
            activeStatus === key
              ? config.color + " ring-1 ring-current"
              : config.color + " opacity-70 hover:opacity-100"
          )}
        >
          {config.label} {count}
        </button>
      ))}
    </div>
  );
}

export { STATUS_CONFIG };
