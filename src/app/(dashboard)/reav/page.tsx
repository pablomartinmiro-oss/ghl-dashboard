"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Siren,
  Plus,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { useREAVDashboard } from "@/hooks/useREAV";
import { cn } from "@/lib/utils";
import { RegistryModal } from "./_components/RegistryModal";

const DOC_LABEL: Record<string, string> = {
  risk_assessment: "Evaluación de riesgos",
  emergency_plan: "Plan de emergencia",
  safety_protocol: "Protocolo de seguridad",
  insurance_cert: "Certificado de seguro",
  instructor_cert: "Certificado instructor",
  equipment_check: "Revisión de equipos",
  incident_report: "Informe de incidente",
  other: "Otro",
};

const REG_STATUS: Record<string, { label: string; klass: string }> = {
  active: { label: "Activo", klass: "bg-sage/15 text-sage" },
  pending: { label: "Pendiente", klass: "bg-warm-gold/20 text-warm-gold" },
  expired: { label: "Expirado", klass: "bg-danger/15 text-danger" },
  suspended: { label: "Suspendido", klass: "bg-zinc-200 text-zinc-700" },
};

const scoreColor = (s: number) =>
  s >= 80 ? "text-sage" : s >= 50 ? "text-warm-gold" : "text-danger";
const scoreBar = (s: number) =>
  s >= 80 ? "bg-sage" : s >= 50 ? "bg-warm-gold" : "bg-danger";

function daysLabel(days: number | null, prefix = "Vence"): string {
  if (days === null) return "Sin fecha";
  if (days < 0) return `Expirado hace ${Math.abs(days)}d`;
  return `${prefix} en ${days}d`;
}

function daysColor(days: number | null): string {
  if (days === null) return "text-text-secondary";
  if (days < 0) return "text-danger";
  if (days < 30) return "text-warm-gold";
  return "text-sage";
}

export default function REAVPage() {
  const { data: dash, isLoading } = useREAVDashboard();
  const [registryOpen, setRegistryOpen] = useState(false);

  const score = dash?.complianceScore ?? 0;
  const regMeta = REG_STATUS[dash?.registry?.status ?? "pending"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            REAV Cumplimiento
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">Registro y seguridad</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/reav/documentos"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <Plus className="h-4 w-4" /> Nuevo documento
          </Link>
          <Link
            href="/reav/incidentes"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <Siren className="h-4 w-4" /> Reportar incidente
          </Link>
          <button
            onClick={() => setRegistryOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            <ClipboardList className="h-4 w-4" /> Actualizar registro
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={<ShieldCheck className="h-4 w-4" />} title="Cumplimiento">
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={cn("font-mono text-3xl font-semibold", scoreColor(score))}>
              {isLoading ? "—" : score}
            </span>
            <span className="text-sm text-text-secondary">/ 100</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-warm-muted">
            <div className={cn("h-full rounded-full", scoreBar(score))} style={{ width: `${score}%` }} />
          </div>
          <div className="mt-2 text-xs text-text-secondary">
            {dash?.required.covered ?? 0}/{dash?.required.total ?? 0} documentos requeridos
          </div>
        </Card>

        <Card icon={<ClipboardList className="h-4 w-4" />} title="Registro">
          <div className="mt-2">
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", regMeta.klass)}>
              {regMeta.label}
            </span>
          </div>
          <div className="mt-2 font-mono text-sm text-text-primary">
            {dash?.registry?.registryNumber ?? "— Sin número —"}
          </div>
          <div className={cn("mt-1 text-xs font-medium", daysColor(dash?.registryDaysLeft ?? null))}>
            {daysLabel(dash?.registryDaysLeft ?? null)}
          </div>
        </Card>

        <Card icon={<ShieldAlert className="h-4 w-4" />} title="Seguro">
          <div className="mt-2 truncate font-mono text-sm text-text-primary">
            {dash?.registry?.insurancePolicy ?? "— Sin póliza —"}
          </div>
          <div className={cn("mt-2 text-xs font-medium", daysColor(dash?.insuranceDaysLeft ?? null))}>
            {dash?.insuranceDaysLeft === null ? "No registrado" : daysLabel(dash?.insuranceDaysLeft ?? null)}
          </div>
        </Card>

        <Card icon={<Siren className="h-4 w-4" />} title="Incidentes abiertos">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold text-text-primary">
              {dash?.incidents.open ?? 0}
            </span>
            {(dash?.incidents.critical ?? 0) > 0 && (
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
                {dash?.incidents.critical} críticos
              </span>
            )}
          </div>
          <Link href="/reav/incidentes" className="mt-2 inline-block text-xs font-medium text-coral hover:underline">
            Ver todos →
          </Link>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <AlertList title="Documentos por vencer" icon={<AlertTriangle className="h-4 w-4 text-warm-gold" />}>
          {(dash?.documents.expiring.length ?? 0) === 0 ? (
            <Empty text="Ningún documento vence en 30 días" />
          ) : (
            dash?.documents.expiring.slice(0, 5).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="truncate text-sm text-text-primary">{d.title}</span>
                <span className="font-mono text-xs text-warm-gold">{d.daysLeft}d</span>
              </li>
            ))
          )}
        </AlertList>

        <AlertList title="Documentos requeridos faltantes" icon={<FileText className="h-4 w-4 text-danger" />}>
          {(dash?.required.missing.length ?? 0) === 0 ? (
            <Empty text="Todos los documentos requeridos están activos" />
          ) : (
            dash?.required.missing.map((t) => (
              <li key={t} className="flex items-center gap-2 py-1.5 text-sm text-text-primary">
                <CheckCircle2 className="h-3.5 w-3.5 text-danger" />
                {DOC_LABEL[t] ?? t}
              </li>
            ))
          )}
        </AlertList>

        <AlertList title="Resumen de documentos" icon={<FileText className="h-4 w-4 text-text-secondary" />}>
          <SummaryRow label="Activos" value={dash?.documents.active ?? 0} className="text-sage" />
          <SummaryRow label="Expirados" value={dash?.documents.expired ?? 0} className="text-danger" />
          <SummaryRow label="Total" value={dash?.documents.total ?? 0} className="text-text-primary" />
          <li className="pt-2">
            <Link href="/reav/documentos" className="text-xs font-medium text-coral hover:underline">
              Gestionar documentos →
            </Link>
          </li>
        </AlertList>
      </div>

      <RegistryModal
        open={registryOpen}
        onClose={() => setRegistryOpen(false)}
        initial={dash?.registry ?? null}
      />
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function AlertList({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        {icon}
        {title}
      </div>
      <ul className="mt-2 divide-y divide-warm-border">{children}</ul>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <li className="py-3 text-sm text-text-secondary">{text}</li>;
}

function SummaryRow({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <li className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className={cn("font-mono font-medium", className)}>{value}</span>
    </li>
  );
}
