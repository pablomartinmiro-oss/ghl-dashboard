"use client";

import Link from "next/link";
import {
  Megaphone,
  FileText,
  Tag,
  ArrowRight,
  Mail,
  MousePointerClick,
  Send,
  Users,
} from "lucide-react";
import {
  useCampaigns,
  usePromotions,
  type CampaignStats,
} from "@/hooks/useMarketing";
import { CAMPAIGN_STATUS_META, CAMPAIGN_TYPE_META, StatusPill } from "./_components/badges";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pct(part: number, total: number): string {
  if (!total) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

export default function MarketingOverviewPage() {
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { data: promotions, isLoading: loadingPromos } = usePromotions();

  const totals = (campaigns ?? []).reduce(
    (acc, c) => {
      const s: CampaignStats = c.stats ?? {};
      acc.sent += s.sent ?? 0;
      acc.opened += s.opened ?? 0;
      acc.clicked += s.clicked ?? 0;
      return acc;
    },
    { sent: 0, opened: 0, clicked: 0 }
  );

  const activeCampaigns = (campaigns ?? []).filter(
    (c) => c.status === "active" || c.status === "scheduled"
  );
  const activePromos = (promotions ?? []).filter((p) => p.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Marketing
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Campañas, plantillas y promociones automatizadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/marketing/campanas"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            <Megaphone className="h-4 w-4" /> Nueva campaña
          </Link>
          <Link
            href="/marketing/promociones"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <Tag className="h-4 w-4" /> Nueva promoción
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Send className="h-4 w-4" />} title="Envíos totales">
          <span className="font-mono text-3xl font-semibold text-text-primary">
            {totals.sent.toLocaleString("es-ES")}
          </span>
        </StatCard>
        <StatCard icon={<Mail className="h-4 w-4" />} title="Tasa apertura">
          <span className="font-mono text-3xl font-semibold text-sage">
            {pct(totals.opened, totals.sent)}
          </span>
          <p className="mt-1 text-xs text-text-secondary">
            {totals.opened.toLocaleString("es-ES")} abiertos
          </p>
        </StatCard>
        <StatCard
          icon={<MousePointerClick className="h-4 w-4" />}
          title="Tasa clic"
        >
          <span className="font-mono text-3xl font-semibold text-coral">
            {pct(totals.clicked, totals.sent)}
          </span>
          <p className="mt-1 text-xs text-text-secondary">
            {totals.clicked.toLocaleString("es-ES")} clics
          </p>
        </StatCard>
        <StatCard icon={<Tag className="h-4 w-4" />} title="Promos activas">
          <span className="font-mono text-3xl font-semibold text-text-primary">
            {activePromos.length}
          </span>
          <p className="mt-1 text-xs text-text-secondary">
            de {promotions?.length ?? 0} totales
          </p>
        </StatCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Campañas activas"
          icon={<Megaphone className="h-4 w-4 text-coral" />}
          href="/marketing/campanas"
        >
          {loadingCampaigns ? (
            <Empty text="Cargando…" />
          ) : activeCampaigns.length === 0 ? (
            <Empty text="No hay campañas activas o programadas" />
          ) : (
            <ul className="divide-y divide-warm-border">
              {activeCampaigns.slice(0, 5).map((c) => {
                const sent = c.stats?.sent ?? 0;
                const opened = c.stats?.opened ?? 0;
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-text-primary">
                          {c.name}
                        </span>
                        <StatusPill meta={CAMPAIGN_TYPE_META[c.type]} />
                      </div>
                      <div className="mt-0.5 text-xs text-text-secondary">
                        {fmtDate(c.scheduledAt ?? c.startedAt ?? c.createdAt)} ·{" "}
                        {sent.toLocaleString("es-ES")} envíos · {pct(opened, sent)}{" "}
                        apertura
                      </div>
                    </div>
                    <StatusPill meta={CAMPAIGN_STATUS_META[c.status]} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Promociones recientes"
          icon={<Tag className="h-4 w-4 text-coral" />}
          href="/marketing/promociones"
        >
          {loadingPromos ? (
            <Empty text="Cargando…" />
          ) : (promotions?.length ?? 0) === 0 ? (
            <Empty text="No hay promociones creadas" />
          ) : (
            <ul className="divide-y divide-warm-border">
              {promotions?.slice(0, 5).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-primary">
                      {p.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
                      <span className="rounded bg-warm-muted px-1.5 py-0.5 font-mono">
                        {p.code}
                      </span>
                      <span>
                        {p.currentUses}
                        {p.maxUses ? `/${p.maxUses}` : ""} usos
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-text-primary">
                    {p.type === "percentage"
                      ? `${p.value ?? 0}%`
                      : p.type === "fixed"
                        ? `${((p.value ?? 0) / 100).toFixed(2)} €`
                        : p.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/marketing/campanas"
          icon={<Megaphone className="h-5 w-5" />}
          title="Campañas"
          description="Diseña y envía emails masivos"
        />
        <QuickAction
          href="/marketing/plantillas"
          icon={<FileText className="h-5 w-5" />}
          title="Plantillas"
          description="Reutiliza diseños y variables"
        />
        <QuickAction
          href="/marketing/promociones"
          icon={<Tag className="h-5 w-5" />}
          title="Promociones"
          description="Códigos de descuento y ofertas"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
        {icon}
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Panel({
  title,
  icon,
  href,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          {icon} {title}
        </div>
        <Link
          href={href}
          className="text-xs font-medium text-coral hover:underline"
        >
          Ver todas →
        </Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-text-secondary">{text}</p>;
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-warm-border bg-white p-4 transition hover:border-coral/40 hover:bg-warm-muted/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-coral/10 text-coral">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-sm font-semibold text-text-primary">
          {title}
          <Users className="hidden" aria-hidden />
        </div>
        <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-text-secondary" />
    </Link>
  );
}
