"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  useSafetyDocuments,
  useDeleteSafetyDocument,
  type SafetyDocument,
} from "@/hooks/useREAV";
import { cn } from "@/lib/utils";
import { DocumentModal } from "../_components/DocumentModal";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "risk_assessment", label: "Evaluación de riesgos" },
  { value: "emergency_plan", label: "Plan de emergencia" },
  { value: "safety_protocol", label: "Protocolo de seguridad" },
  { value: "insurance_cert", label: "Certificado de seguro" },
  { value: "instructor_cert", label: "Certificado instructor" },
  { value: "equipment_check", label: "Revisión de equipos" },
  { value: "incident_report", label: "Informe de incidente" },
  { value: "other", label: "Otro" },
];

const STATUSES: { value: string; label: string; klass: string }[] = [
  { value: "draft", label: "Borrador", klass: "bg-zinc-100 text-zinc-700" },
  { value: "active", label: "Activo", klass: "bg-sage/15 text-sage" },
  { value: "expired", label: "Expirado", klass: "bg-danger/15 text-danger" },
  { value: "archived", label: "Archivado", klass: "bg-warm-muted text-text-secondary" },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: "general", label: "General" },
  { value: "snow", label: "Nieve" },
  { value: "mountain", label: "Montaña" },
  { value: "water", label: "Agua" },
  { value: "equipment", label: "Equipamiento" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DocumentosPage() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SafetyDocument | null>(null);

  const filters = useMemo(
    () => ({
      type: type || undefined,
      status: status || undefined,
      category: category || undefined,
    }),
    [type, status, category]
  );

  const { data: documents, isLoading } = useSafetyDocuments(filters);
  const del = useDeleteSafetyDocument();

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(d: SafetyDocument) {
    setEditing(d);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Documento eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  const typeLabel = (v: string) =>
    DOC_TYPES.find((t) => t.value === v)?.label ?? v;
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
            Documentos de Seguridad
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Registro y caducidad de la documentación REAV
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" />
          Nuevo documento
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-warm-border bg-white p-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Todos los tipos</option>
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-text-secondary">
          {documents?.length ?? 0} documentos
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-muted/40 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Tipo</th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Título</th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Válido desde</th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Válido hasta</th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">Estado</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-secondary">Cargando…</td></tr>
              )}
              {!isLoading && (documents?.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-secondary">
                  Sin documentos. Crea el primero con &ldquo;Nuevo documento&rdquo;.
                </td></tr>
              )}
              {documents?.map((d) => {
                const meta = statusMeta(d.status);
                return (
                  <tr key={d.id} className="hover:bg-warm-muted/40">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex rounded-full bg-warm-muted px-2 py-0.5 text-xs font-medium text-text-primary">
                        {typeLabel(d.type)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-text-primary">{d.title}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">{fmtDate(d.validFrom)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">{fmtDate(d.validUntil)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", meta.klass)}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(d)}
                          className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral"
                          aria-label="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
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

      <DocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
      />
    </div>
  );
}
