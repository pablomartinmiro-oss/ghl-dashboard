"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileCode,
  Plus,
  Save,
  RotateCcw,
  Trash2,
  Star,
  Eye,
  History,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useDocumentTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  usePreviewTemplate,
  useGeneratedDocuments,
  type DocumentTemplate,
  type TemplateVariable,
} from "@/hooks/useTemplates";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_KIND,
  getDefaultTemplate,
  type DocumentType,
} from "@/lib/templates/defaults";

interface DraftState {
  id: string | null;
  type: DocumentType;
  name: string;
  subject: string;
  htmlBody: string;
  variables: TemplateVariable[];
  isDefault: boolean;
  active: boolean;
}

function makeDraftFromTemplate(t: DocumentTemplate): DraftState {
  return {
    id: t.id,
    type: t.type,
    name: t.name,
    subject: t.subject ?? "",
    htmlBody: t.htmlBody,
    variables: t.variables ?? [],
    isDefault: t.isDefault,
    active: t.active,
  };
}

function makeDraftFromDefault(type: DocumentType): DraftState {
  const def = getDefaultTemplate(type);
  return {
    id: null,
    type,
    name: def.name,
    subject: def.subject ?? "",
    htmlBody: def.htmlBody,
    variables: def.variables,
    isDefault: false,
    active: true,
  };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PlantillasPage() {
  const { data: templates, isLoading } = useDocumentTemplates();
  const { data: documents } = useGeneratedDocuments();
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const del = useDeleteTemplate();
  const preview = usePreviewTemplate();

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [autoPreview, setAutoPreview] = useState(true);

  const grouped = useMemo(() => {
    const map = new Map<DocumentType, DocumentTemplate[]>();
    for (const t of DOCUMENT_TYPES) map.set(t, []);
    for (const t of templates ?? []) {
      const list = map.get(t.type) ?? [];
      list.push(t);
      map.set(t.type, list);
    }
    return map;
  }, [templates]);

  useEffect(() => {
    if (!draft || !autoPreview) return;
    const handle = setTimeout(() => {
      runPreview(draft);
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.htmlBody, draft?.subject, draft?.id]);

  async function runPreview(d: DraftState) {
    if (!d.id) {
      setPreviewHtml(
        '<div style="padding:24px;font-family:DM Sans,sans-serif;color:#8A8580;">Guarda la plantilla para previsualizarla con datos reales del tenant.</div>'
      );
      setPreviewSubject(d.subject || null);
      return;
    }
    try {
      const result = await preview.mutateAsync({ id: d.id });
      setPreviewHtml(result.html);
      setPreviewSubject(result.subject);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error en previsualización");
    }
  }

  function openNewFromDefault(type: DocumentType) {
    setDraft(makeDraftFromDefault(type));
    setPreviewHtml("");
    setPreviewSubject(null);
  }

  function openEdit(t: DocumentTemplate) {
    setDraft(makeDraftFromTemplate(t));
    setPreviewHtml("");
    setPreviewSubject(null);
  }

  function resetToDefault() {
    if (!draft) return;
    const def = getDefaultTemplate(draft.type);
    setDraft({
      ...draft,
      name: def.name,
      subject: def.subject ?? "",
      htmlBody: def.htmlBody,
      variables: def.variables,
    });
    toast.info("Plantilla restablecida al diseño por defecto");
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim() || !draft.htmlBody.trim()) {
      toast.error("Nombre y contenido son obligatorios");
      return;
    }
    const payload = {
      type: draft.type,
      name: draft.name.trim(),
      subject: draft.subject.trim() || null,
      htmlBody: draft.htmlBody,
      variables: draft.variables,
      isDefault: draft.isDefault,
      active: draft.active,
    };
    try {
      if (draft.id) {
        const res = await update.mutateAsync({ id: draft.id, ...payload });
        setDraft(makeDraftFromTemplate(res.template));
        toast.success("Plantilla guardada");
      } else {
        const res = await create.mutateAsync(payload);
        setDraft(makeDraftFromTemplate(res.template));
        toast.success("Plantilla creada");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta plantilla? No se podrá recuperar.")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Plantilla eliminada");
      if (draft?.id === id) setDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  function insertVariable(key: string) {
    if (!draft) return;
    const snippet = `{{${key}}}`;
    setDraft({ ...draft, htmlBody: draft.htmlBody + snippet });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Plantillas de documentos
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Diseña los emails y PDFs que enviamos a clientes y proveedores.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          {DOCUMENT_TYPES.map((type) => {
            const list = grouped.get(type) ?? [];
            return (
              <div
                key={type}
                className="rounded-2xl border border-warm-border bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                      {DOCUMENT_TYPE_KIND[type] === "pdf" ? "PDF" : "Email"}
                    </div>
                    <div className="text-sm font-semibold text-text-primary">
                      {DOCUMENT_TYPE_LABELS[type]}
                    </div>
                  </div>
                  <button
                    onClick={() => openNewFromDefault(type)}
                    className="inline-flex items-center gap-1 rounded-[8px] bg-coral px-2 py-1.5 text-xs font-medium text-white hover:bg-coral-hover"
                    aria-label="Nueva plantilla"
                  >
                    <Plus className="h-3 w-3" />
                    Nueva
                  </button>
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-text-secondary">
                    Sin plantillas. Crea una a partir del diseño por defecto.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {list.map((t) => {
                      const isActive = draft?.id === t.id;
                      return (
                        <li key={t.id}>
                          <button
                            onClick={() => openEdit(t)}
                            className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-coral/10 text-text-primary"
                                : "text-text-primary hover:bg-warm-muted"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate">{t.name}</span>
                              {t.isDefault && (
                                <Star className="h-3 w-3 fill-coral text-coral" />
                              )}
                            </span>
                            {!t.active && (
                              <span className="rounded bg-warm-muted px-1.5 py-0.5 text-[10px] uppercase text-text-secondary">
                                inactiva
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </aside>

        <section className="space-y-4">
          {!draft ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-warm-border bg-white text-center">
              <FileCode className="mb-2 h-7 w-7 text-text-secondary/60" />
              <p className="text-sm text-text-secondary">
                {isLoading
                  ? "Cargando plantillas…"
                  : "Selecciona una plantilla o crea una nueva."}
              </p>
            </div>
          ) : (
            <Editor
              draft={draft}
              setDraft={setDraft}
              onSave={save}
              onDelete={() => draft.id && handleDelete(draft.id)}
              onResetDefault={resetToDefault}
              onPreview={() => runPreview(draft)}
              autoPreview={autoPreview}
              setAutoPreview={setAutoPreview}
              previewHtml={previewHtml}
              previewSubject={previewSubject}
              previewLoading={preview.isPending}
              saving={create.isPending || update.isPending}
              onInsertVariable={insertVariable}
            />
          )}

          <div className="rounded-2xl border border-warm-border bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-text-secondary" />
              <h2 className="text-sm font-semibold text-text-primary">
                Documentos generados
              </h2>
            </div>
            {(documents?.length ?? 0) === 0 ? (
              <p className="text-xs text-text-secondary">
                Aún no se ha generado ningún documento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
                      <th className="pb-2 font-medium">Título</th>
                      <th className="pb-2 font-medium">Tipo</th>
                      <th className="pb-2 font-medium">Destinatario</th>
                      <th className="pb-2 font-medium">Creado</th>
                      <th className="pb-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents?.map((d) => (
                      <tr key={d.id} className="border-t border-warm-border">
                        <td className="py-2 pr-3 text-text-primary">{d.title}</td>
                        <td className="py-2 pr-3 text-text-secondary">
                          {DOCUMENT_TYPE_LABELS[d.type]}
                        </td>
                        <td className="py-2 pr-3 text-text-secondary">
                          {d.recipientEmail ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-text-secondary">
                          {fmtDate(d.createdAt)}
                        </td>
                        <td className="py-2 pr-3">
                          <a
                            href={`/api/documents/${d.id}?format=html`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-coral hover:underline"
                          >
                            <Eye className="h-3 w-3" /> Ver
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

interface EditorProps {
  draft: DraftState;
  setDraft: (d: DraftState) => void;
  onSave: () => void;
  onDelete: () => void;
  onResetDefault: () => void;
  onPreview: () => void;
  autoPreview: boolean;
  setAutoPreview: (v: boolean) => void;
  previewHtml: string;
  previewSubject: string | null;
  previewLoading: boolean;
  saving: boolean;
  onInsertVariable: (key: string) => void;
}

function Editor(props: EditorProps) {
  const {
    draft,
    setDraft,
    onSave,
    onDelete,
    onResetDefault,
    onPreview,
    autoPreview,
    setAutoPreview,
    previewHtml,
    previewSubject,
    previewLoading,
    saving,
    onInsertVariable,
  } = props;
  const isEmail = DOCUMENT_TYPE_KIND[draft.type] === "email";

  return (
    <div className="space-y-3 rounded-2xl border border-warm-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-warm-muted px-2 py-0.5 text-xs font-medium text-text-primary">
            {DOCUMENT_TYPE_LABELS[draft.type]}
          </span>
          {draft.id ? (
            <span className="text-xs text-text-secondary">Editando</span>
          ) : (
            <span className="text-xs text-text-secondary">Nueva plantilla</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onResetDefault}
            type="button"
            className="inline-flex items-center gap-1 rounded-[10px] border border-warm-border px-2.5 py-1.5 text-xs text-text-primary hover:bg-warm-muted"
          >
            <RotateCcw className="h-3 w-3" /> Restablecer
          </button>
          {draft.id && (
            <button
              onClick={onDelete}
              type="button"
              className="inline-flex items-center gap-1 rounded-[10px] border border-warm-border px-2.5 py-1.5 text-xs text-warm-red hover:bg-warm-red/10"
            >
              <Trash2 className="h-3 w-3" /> Eliminar
            </button>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            type="button"
            className="inline-flex items-center gap-1 rounded-[10px] bg-coral px-3 py-1.5 text-xs font-medium text-white hover:bg-coral-hover disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Guardar
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-text-secondary">
          Nombre
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="mt-1 w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-coral"
          />
        </label>
        <label className="text-xs font-medium text-text-secondary">
          Tipo
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft({ ...draft, type: e.target.value as DocumentType })
            }
            disabled={!!draft.id}
            className="mt-1 w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-coral disabled:opacity-60"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isEmail && (
        <label className="block text-xs font-medium text-text-secondary">
          Asunto del email
          <input
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            placeholder="Tu reserva está confirmada — {{branding.businessName}}"
            className="mt-1 w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-coral"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}
          />
          Marcar como predeterminada
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          Activa
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={autoPreview}
            onChange={(e) => setAutoPreview(e.target.checked)}
          />
          Previsualización automática
        </label>
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1 rounded-[8px] border border-warm-border px-2 py-1 hover:bg-warm-muted"
        >
          <Eye className="h-3 w-3" /> Previsualizar ahora
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-secondary">
            Contenido HTML
          </label>
          <textarea
            value={draft.htmlBody}
            onChange={(e) => setDraft({ ...draft, htmlBody: e.target.value })}
            spellCheck={false}
            className="h-[420px] w-full resize-y rounded-[10px] border border-warm-border bg-white p-3 font-mono text-xs leading-relaxed text-text-primary outline-none focus:border-coral"
          />
        </div>

        <div className="rounded-[10px] border border-warm-border bg-warm-muted/40 p-3">
          <p className="text-xs font-medium text-text-primary">Variables</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            Haz clic para insertar.
          </p>
          <div className="mt-2 max-h-[400px] space-y-1 overflow-y-auto pr-1">
            {draft.variables.length === 0 && (
              <p className="text-[11px] text-text-secondary">Sin variables.</p>
            )}
            {draft.variables.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => onInsertVariable(v.key)}
                className="block w-full rounded bg-white px-2 py-1.5 text-left text-[11px] hover:bg-coral/10"
              >
                <code className="font-mono text-coral">{`{{${v.key}}}`}</code>
                <div className="text-[10px] text-text-secondary">{v.label}</div>
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  variables: [
                    ...draft.variables,
                    { key: "custom_var", label: "Variable personalizada" },
                  ],
                })
              }
              className="mt-1 block w-full rounded border border-dashed border-warm-border px-2 py-1.5 text-left text-[11px] text-text-secondary hover:bg-white"
            >
              + Añadir variable
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-secondary">Vista previa</p>
          {previewLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-text-secondary" />
          )}
        </div>
        {isEmail && previewSubject !== null && (
          <div className="rounded-[10px] border border-warm-border bg-warm-muted/40 px-3 py-2 text-xs text-text-primary">
            <span className="font-medium text-text-secondary">Asunto: </span>
            {previewSubject || <em className="text-text-secondary">(vacío)</em>}
          </div>
        )}
        <div className="overflow-hidden rounded-[10px] border border-warm-border bg-white">
          <iframe
            title="Vista previa"
            srcDoc={previewHtml}
            sandbox=""
            className="h-[520px] w-full"
          />
        </div>
      </div>
    </div>
  );
}
