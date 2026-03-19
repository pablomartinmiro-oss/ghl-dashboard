"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Euro, Users, MessageCircle,
  BarChart3, CalendarCheck, Snowflake, Target, Trophy, XCircle, Send, RefreshCw,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface PipelineBreakdown {
  pipelineId: string;
  pipelineName: string;
  count: number;
  value: number;
}

interface LeadSource {
  source: string;
  count: number;
}

interface DashboardStats {
  ghlConnected: boolean;
  ghlError: string | null;
  stats: {
    totalContacts: number;
    totalOpportunities: number;
    pipelineValue: number;
    activeConversations: number;
    pipelineCount: number;
    wonDeals: number;
    lostDeals: number;
    pipelineBreakdown: PipelineBreakdown[];
    leadSources: LeadSource[];
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

function formatRelativeSync(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "ahora mismo";
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  return `hace ${Math.floor(diffHours / 24)}d`;
}

export default function DashboardHome() {
  const queryClient = useQueryClient();
  const { data: quotes, isLoading: quotesLoading } = useQuotes();
  const { data: dashStats, isLoading: statsLoading, isFetching: statsFetching } = useDashboardStats();
  const { data: resStats, isLoading: resStatsLoading } = useReservationStats();

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    queryClient.invalidateQueries({ queryKey: ["reservation-stats"] });
  }

  const allQuotes = useMemo(() => quotes ?? [], [quotes]);
  const hasGHLData = dashStats?.ghlConnected && dashStats.stats;
  const stats = dashStats?.stats;

  const sent = allQuotes.filter((q) => q.status === "enviado" || q.status === "aceptado");
  const accepted = allQuotes.filter((q) => q.status === "aceptado");
  const conversionRate = sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : 0;

  const dailyVolume = resStats?.dailyVolume ?? [];
  const maxDayCount = Math.max(1, ...dailyVolume.map((d) => d.count));

  const recentQuotes = allQuotes.slice(0, 3);
  const recentReservations = resStats?.recentReservations ?? [];

  // Pipeline breakdown chart
  const pipelineBreakdown = stats?.pipelineBreakdown ?? [];
  const maxPipelineCount = Math.max(1, ...pipelineBreakdown.map((p) => p.count));

  // Lead sources chart
  const leadSources = stats?.leadSources ?? [];
  const maxSourceCount = Math.max(1, ...leadSources.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary">
            Resumen de actividad de Skicenter
            {hasGHLData && stats?.lastSync && (
              <span className="ml-2 text-xs text-sage">
                · Sincronizado {formatRelativeSync(stats.lastSync)}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={statsFetching}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${statsFetching ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <OnboardingCards />

      {/* GHL KPI Cards */}
      {hasGHLData && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/contacts"><StatCard title="Contactos" value={stats.totalContacts.toLocaleString("es-ES")} description="en GoHighLevel" icon={Users} loading={statsLoading} iconColor="text-coral" iconBg="bg-coral-light" /></Link>
          <Link href="/pipeline"><StatCard title="Oportunidades" value={stats.totalOpportunities.toLocaleString("es-ES")} description={`${stats.pipelineCount} pipelines`} icon={Target} loading={statsLoading} iconColor="text-soft-blue" iconBg="bg-soft-blue-light" /></Link>
          <Link href="/pipeline"><StatCard title="Valor Pipeline" value={formatCurrency(stats.pipelineValue)} description="oportunidades abiertas" icon={BarChart3} loading={statsLoading} iconColor="text-sage" iconBg="bg-sage-light" /></Link>
          <Link href="/comms"><StatCard title="Conversaciones" value={stats.activeConversations} description="últimos 7 días" icon={MessageCircle} loading={statsLoading} iconColor="text-gold" iconBg="bg-gold-light" /></Link>
        </div>
      )}

      {/* Deals won/lost + Reservation KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hasGHLData && stats && (
          <>
            <Link href="/pipeline"><StatCard title="Deals Ganados" value={stats.wonDeals} description="cerrados con éxito" icon={Trophy} loading={statsLoading} iconColor="text-sage" iconBg="bg-sage-light" /></Link>
            <Link href="/pipeline"><StatCard title="Deals Perdidos" value={stats.lostDeals} description="no convertidos" icon={XCircle} loading={statsLoading} iconColor="text-muted-red" iconBg="bg-red-50" /></Link>
          </>
        )}
        <Link href="/reservas"><StatCard title="Reservas Hoy" value={resStats?.today.total ?? 0} description={`${resStats?.today.confirmed ?? 0} confirmadas`} icon={CalendarCheck} loading={resStatsLoading} iconColor="text-coral" iconBg="bg-coral-light" /></Link>
        <Link href="/reservas"><StatCard title="Ingresos Semanales" value={formatCurrency(resStats?.weekly.totalRevenue ?? 0)} description={`${resStats?.weekly.totalReservations ?? 0} reservas`} icon={Euro} loading={resStatsLoading} iconColor="text-sage" iconBg="bg-sage-light" /></Link>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Oportunidades por Pipeline */}
        {pipelineBreakdown.length > 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Oportunidades por Pipeline</h2>
              <span className="text-xs text-text-secondary">{stats?.totalOpportunities.toLocaleString("es-ES")} total</span>
            </div>
            <div className="space-y-3">
              {pipelineBreakdown.map((p, i) => {
                const pct = (p.count / maxPipelineCount) * 100;
                const colors = ["bg-coral", "bg-sage", "bg-gold", "bg-soft-blue", "bg-muted-red", "bg-coral/60", "bg-sage/60"];
                return (
                  <div key={p.pipelineId}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-text-primary">{p.pipelineName}</span>
                      <span className="text-xs font-medium text-text-secondary">
                        {p.count} · {formatCurrency(p.value)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all`} style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leads por Origen */}
        {leadSources.length > 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Leads por Origen</h2>
              <span className="text-xs text-text-secondary">{stats?.totalContacts.toLocaleString("es-ES")} contactos</span>
            </div>
            <div className="space-y-3">
              {leadSources.map((s, i) => {
                const pct = (s.count / maxSourceCount) * 100;
                const colors = ["bg-sage", "bg-coral", "bg-gold", "bg-soft-blue", "bg-muted-red"];
                return (
                  <div key={s.source}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-text-primary">{s.source}</span>
                      <span className="text-xs font-medium text-text-secondary">{s.count.toLocaleString("es-ES")}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all`} style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reservas esta semana + Presupuestos */}
      <div className="grid gap-6 lg:grid-cols-2">
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

        {/* Presupuestos KPIs */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Presupuestos</h2>
            <span className="text-xs text-text-secondary">{allQuotes.length} total</span>
          </div>
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">{sent.length}</p>
              <p className="text-xs text-text-secondary">Enviados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-sage">{accepted.length}</p>
              <p className="text-xs text-text-secondary">Aceptados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-coral">{conversionRate}%</p>
              <p className="text-xs text-text-secondary">Conversión</p>
            </div>
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
          <div className="flex gap-3">
            <Link href="/reservas" className="text-xs text-coral hover:underline">Ver reservas →</Link>
            <Link href="/presupuestos" className="text-xs text-coral hover:underline">Ver presupuestos →</Link>
          </div>
        </div>
        <div className="space-y-3">
          {hasGHLData && stats?.recentOpportunities.map((opp) => (
            <div key={opp.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${opp.status === "won" ? "bg-sage" : opp.status === "lost" ? "bg-muted-red" : "bg-soft-blue"}`} />
                <div>
                  <p className="text-sm font-medium text-text-primary">{opp.name}</p>
                  <p className="text-xs text-text-secondary">Oportunidad · {opp.status === "won" ? "Ganada" : opp.status === "lost" ? "Perdida" : "Abierta"}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-text-secondary">{opp.monetaryValue ? formatCurrency(opp.monetaryValue) : "—"}</span>
            </div>
          ))}

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
