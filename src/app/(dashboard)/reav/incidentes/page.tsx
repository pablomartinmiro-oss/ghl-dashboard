"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  useIncidents,
  useDeleteIncident,
  type IncidentReport,
} from "@/hooks/useREAV";
import { cn } from "@/lib/utils";
import { IncidentModal } from "../_components/IncidentModal";

const SEVERITIES: { value: string; label: string; klass: string }[] = [
  { value: "minor", label: "Leve", klass: "bg-zinc-100 text-zinc-700" },
  { value: "moderate", label: "Moderada", klass: "bg-warm-gold/20 text-warm-gold" },
  { value: "serious", label: "Grave", klass: "bg-orange-100 text-orange-700" },
  { value: "critical", label: "Crítica", klass: "bg-danger/15 text-danger" },
];

const STATUSES: { value: string; label: string; klass: string }[] = [
  { value: "open", label: "Abierto", klass: "bg-blue-100 text-blue-700" },
  { value: "investigating", label: "Investigando", klass: "bg-warm-gold/20 text-warm-gold" },
  { value: "resolved", label: "Resuelto", klass: "bg-sage/15 text-sage" },
  { value: "closed", label: "Cerrado", klass: "bg-zinc-100 text-zinc-700" },
];

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export default function IncidentesPage() {
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IncidentReport | null>(null);

  const filters = useMemo(
    () => ({
      severity: severity || undefined,
      status: status || undefined,
    }),
    [severity, status]
  );

  const { data: incidents, isLoading } = useIncidents(filters);
  const del = useDeleteIncident();

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(i: IncidentReport) {
    setEditing(i);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este incidente?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Incidente eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  const sevMeta = (v: string) =>
    SEVERITIES.find((s) => s.value === v) ?? SEVERITIES[0];
  const statusMeta = (v: string) =>
    STATUSES.find((s) => s.value === v) ?? STATUSES[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/reav"
            className="mb-1 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-3 w-3" />
            REAV
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Incidentes
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Registro y seguimiento de incidentes
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" />
          Reportar incidente
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-warm-border bg-white p-3">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Todas las severidades</option>
          {SEVERITIES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-text-secondary">
          {incidents?.length ?? 0} incidentes
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-muted/40 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Fecha</th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Ubicación</th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Severidad</th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Descripción</th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Estado</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-secondary">Cargando…</td></tr>
              )}
              {!isLoading && (incidents?.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-secondary">
                  Sin incidentes registrados.
                </td></tr>
              )}
              {incidents?.map((i) => {
                const sev = sevMeta(i.severity);
                const st = statusMeta(i.status);
                return (
                  <tr key={i.id} className="hover:bg-warm-muted/40">
                    <td className="px-4 py-2.5 font-mono text-xs text-text-secondary whitespace-nowrap">
                      {fmtDateTime(i.date)}
                    </td>
                    <td className="px-4 py-2.5 text-text-primary">
                      <div className="font-medium">{i.location}</div>
                      {i.destination && (
                        <div className="text-xs text-text-secondary">{i.destination.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", sev.klass)}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-md text-text-secondary">
                      {truncate(i.description, 80)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", st.klass)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(i)}
                          className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral"
                          aria-label="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(i.id)}
                          className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-danger"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <IncidentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
      />
    </div>
  );
}
