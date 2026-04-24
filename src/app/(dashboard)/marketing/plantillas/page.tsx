"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTemplates,
  useDeleteTemplate,
  type EmailTemplate,
} from "@/hooks/useMarketing";
import { TemplateModal } from "../_components/TemplateModal";

const CATEGORY_LABELS: Record<string, string> = {
  promotional: "Promocional",
  transactional: "Transaccional",
  newsletter: "Newsletter",
  welcome: "Bienvenida",
  reminder: "Recordatorio",
};

export default function PlantillasPage() {
  const { data: templates, isLoading } = useTemplates();
  const del = useDeleteTemplate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(t: EmailTemplate) {
    setEditing(t);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Plantilla eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/marketing"
            className="mb-1 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-3 w-3" />
            Marketing
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Plantillas
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Reutiliza diseños y variables en tus campañas
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-warm-border bg-white p-12 text-center text-sm text-text-secondary">
          Cargando…
        </div>
      ) : (templates?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-warm-border bg-white p-12 text-center">
          <FileText className="mx-auto mb-2 h-6 w-6 text-text-secondary/60" />
          <p className="text-sm text-text-secondary">
            Aún no hay plantillas. Crea la primera con &ldquo;Nueva
            plantilla&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates?.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-warm-border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold text-text-primary">
                      {t.name}
                    </h3>
                    {t.isDefault && (
                      <Star className="h-3 w-3 fill-coral text-coral" />
                    )}
                  </div>
                  {t.category && (
                    <span className="mt-1 inline-flex rounded-full bg-warm-muted px-2 py-0.5 text-xs font-medium text-text-primary">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral"
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-danger"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 rounded-[10px] bg-warm-muted/50 p-3">
                <p className="truncate text-xs font-medium text-text-secondary">
                  Asunto
                </p>
                <p className="mt-0.5 truncate text-sm text-text-primary">
                  {t.subject}
                </p>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-text-secondary">
                {t.body}
              </p>
              {(t.variables?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.variables?.map((v) => (
                    <span
                      key={v.key}
                      className="rounded bg-coral/10 px-1.5 py-0.5 font-mono text-[10px] text-coral"
                    >
                      {`{{${v.key}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
      />
    </div>
  );
}
