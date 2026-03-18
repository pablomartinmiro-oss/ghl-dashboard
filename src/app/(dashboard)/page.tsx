"use client";

import { useMemo } from "react";
import { FileText, Send, TrendingUp, Euro, Users, MessageCircle, BarChart3, CalendarCheck, Snowflake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useQuotes } from "@/hooks/useQuotes";
import { useReservationStats } from "@/hooks/useReservations";
import { StatCard } from "./_components/StatCard";
import { OnboardingCards } from "./_components/OnboardingCards";
import { STATIONS } from "./reservas/_components/constants";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(value);
}

function getStationLabel(value: string): string {
  return STATIONS.find((s) => s.value === value)?.label ?? value;
}

const QUOTE_STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-soft-blue",
  en_proceso: "bg-gold",
  enviado: "bg-sage",
  aceptado: "bg-coral",
};

const RESERVATION_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-gold",
  confirmada: "bg-sage",
  sin_disponibilidad: "bg-muted-red",
  cancelada: "bg-gray-400",
};

interface DashboardStats {
  ghlConnected: boolean;
  ghlError: string | null;
  stats: {
    totalContacts: number;
    pipelineValue: number;
    activeConversations: number;
    pipelineCount: number;
    recentContacts: { id: string; name: string | null; email: string | null; source: string | null; updatedAt: string }[];
    recentOpportunities: { id: string; name: string | null; monetaryValue: number | null; status: string | null; updatedAt: string }[];
    lastSync: string | null;
    syncInProgress: boolean;
  };
}

function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });
}

export default function DashboardHome() {
  const { data: quotes, isLoading: quotesLoading } = useQuotes();
  const { data: dashStats, isLoading: statsLoading } = useDashboardStats();
  const { data: resStats, isLoading: resStatsLoading } = useReservationStats();

  const allQuotes = useMemo(() => quotes ?? [], [quotes]);
  const hasGHLData = dashStats?.ghlConnected && dashStats.stats;

  const sent = allQuotes.filter((q) => q.status === "enviado" || q.status === "aceptado");
  const accepted = allQuotes.filter((q) => q.status === "aceptado");
  const conversionRate = sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : 0;

  const byDestination = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of allQuotes) {
      map[q.destination] = (map[q.destination] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [allQuotes]);

  const maxDestCount = Math.max(1, ...byDestination.map(([, c]) => c));

  const dailyVolume = resStats?.dailyVolume ?? [];
  const maxDayCount = Math.max(1, ...dailyVolume.map((d) => d.count));

  const recentQuotes = allQuotes.slice(0, 3);
  const recentReservations = resStats?.recentReservations ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">
          Resumen de actividad de Skicenter
          {hasGHLData && dashStats.stats?.lastSync && (
            <span className="ml-2 text-xs text-sage">
              Sincronizado: {new Date(dashStats.stats.lastSync).toLocaleString("es-ES")}
            </span>
          )}
        </p>
      </div>

      {/* Onboarding cards for new real tenants */}
      <OnboardingCards />

      {/* GHL Live Stats — only shown in live mode */}
      {hasGHLData && dashStats.stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Contactos GHL" value={dashStats.stats.totalContacts.toLocaleString("es-ES")} description="en GoHighLevel" icon={Users} loading={statsLoading} iconColor="text-coral" iconBg="bg-coral-light" />
          <StatCard title="Valor Pipeline" value={formatCurrency(dashStats.stats.pipelineValue)} description="oportunidades abiertas" icon={BarChart3} loading={statsLoading} iconColor="text-sage" iconBg="bg-sage-light" />
          <StatCard title="Conversaciones Activas" value={dashStats.stats.activeConversations} description="últimos 7 días" icon={MessageCircle} loading={statsLoading} iconColor="text-soft-blue" iconBg="bg-soft-blue-light" />
        </div>
      )}

      {/* Reservation + Quote KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Reservas Hoy" value={resStats?.today.total ?? 0} description={`${resStats?.today.confirmed ?? 0} confirmadas`} icon={CalendarCheck} loading={resStatsLoading} iconColor="text-coral" iconBg="bg-coral-light" />
        <StatCard title="Ingresos Semanales" value={formatCurrency(resStats?.weekly.totalRevenue ?? 0)} description={`${resStats?.weekly.totalReservations ?? 0} reservas`} icon={Euro} loading={resStatsLoading} iconColor="text-sage" iconBg="bg-sage-light" />
        <StatCard title="Presupuestos" value={allQuotes.length} description={`${sent.length} enviados`} icon={FileText} loading={quotesLoading} iconColor="text-soft-blue" iconBg="bg-soft-blue-light" />
        <StatCard title="Tasa Conversión" value={`${conversionRate}%`} description={`${accepted.length} aceptados`} icon={TrendingUp} loading={quotesLoading} iconColor="text-gold" iconBg="bg-gold-light" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly volume — real data */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Reservas Esta Semana</h2>
            <span className="text-xs text-text-secondary">{resStats?.weekly.totalReservations ?? 0} total</span>
          </div>
          <div className="flex h-48 items-end gap-1">
            {dailyVolume.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-text-primary">{d.count > 0 ? d.count : ""}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-coral to-coral/40 transition-all"
                  style={{ height: `${d.count > 0 ? Math.max((d.count / maxDayCount) * 100, 4) : 0}%` }}
                />
                <span className="text-[10px] text-text-secondary">{d.day}</span>
              </div>
            ))}
            {dailyVolume.length === 0 && (
              <div className="flex w-full items-center justify-center text-sm text-text-secondary">Sin datos</div>
            )}
          </div>
        </div>

        {/* By destination */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Por Destino</h2>
            <span className="text-xs text-text-secondary">{allQuotes.length} presupuestos</span>
          </div>
          <div className="space-y-3">
            {byDestination.map(([dest, count], i) => {
              const pct = (count / maxDestCount) * 100;
              const colors = ["bg-coral", "bg-sage", "bg-gold", "bg-soft-blue", "bg-muted-red"];
              return (
                <div key={dest}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-text-primary">{getStationLabel(dest)}</span>
                    <span className="text-xs font-medium text-text-secondary">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all`} style={{ width: `${Math.max(pct, 4)}%` }} />
                  </div>
                </div>
              );
            })}
            {byDestination.length === 0 && !quotesLoading && (
              <p className="py-8 text-center text-sm text-text-secondary">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Top station + source breakdown */}
      {resStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resStats.weekly.topStation && (
            <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral-light">
                <Snowflake className="h-5 w-5 text-coral" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">Estación Más Activa</p>
                <p className="text-lg font-bold text-text-primary">{getStationLabel(resStats.weekly.topStation.name)}</p>
                <p className="text-xs text-text-secondary">{resStats.weekly.topStation.count} reservas esta semana</p>
              </div>
            </div>
          )}
          {Object.entries(resStats.weekly.bySource).map(([src, revenue]) => (
            <div key={src} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${src === "groupon" ? "bg-sage-light" : "bg-gold-light"}`}>
                <Send className={`h-5 w-5 ${src === "groupon" ? "text-sage" : "text-gold"}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary capitalize">{src === "caja" ? "Venta en caja" : src === "groupon" ? "Groupon" : src}</p>
                <p className="text-lg font-bold text-text-primary">{formatCurrency(revenue)}</p>
                <p className="text-xs text-text-secondary">ingresos esta semana</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Actividad Reciente</h2>
        </div>
        <div className="space-y-3">
          {/* GHL recent activity */}
          {hasGHLData && dashStats.stats?.recentOpportunities.map((opp) => (
            <div key={opp.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-sage" />
                <div>
                  <p className="text-sm font-medium text-text-primary">{opp.name}</p>
                  <p className="text-xs text-text-secondary">Oportunidad · {opp.status}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-text-secondary">{opp.monetaryValue ? formatCurrency(opp.monetaryValue) : "—"}</span>
            </div>
          ))}

          {/* Recent reservations */}
          {recentReservations.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${RESERVATION_STATUS_COLORS[r.status] ?? "bg-gray-400"}`} />
                <div>
                  <p className="text-sm font-medium text-text-primary">{r.clientName}</p>
                  <p className="text-xs text-text-secondary">
                    Reserva · {getStationLabel(r.station)} · {new Date(r.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-text-secondary">{formatCurrency(r.totalPrice)}</span>
            </div>
          ))}

          {/* Recent quotes */}
          {recentQuotes.map((quote) => (
            <div key={quote.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${QUOTE_STATUS_COLORS[quote.status] ?? "bg-gray-400"}`} />
                <div>
                  <p className="text-sm font-medium text-text-primary">{quote.clientName}</p>
                  <p className="text-xs text-text-secondary">
                    Presupuesto · {getStationLabel(quote.destination)} · {new Date(quote.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-text-secondary">{formatCurrency(quote.totalAmount)}</span>
            </div>
          ))}

          {recentReservations.length === 0 && recentQuotes.length === 0 && !quotesLoading && !resStatsLoading && !hasGHLData && (
            <p className="py-4 text-center text-sm text-text-secondary">Sin actividad reciente</p>
          )}
        </div>
      </div>
    </div>
  );
}
