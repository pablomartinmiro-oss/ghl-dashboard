"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Send,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCampaigns,
  useDeleteCampaign,
  useSendCampaign,
  type Campaign,
  type CampaignStatus,
} from "@/hooks/useMarketing";
import { CampaignModal } from "../_components/CampaignModal";
import {
  CAMPAIGN_STATUS_META,
  CAMPAIGN_TYPE_META,
  StatusPill,
} from "../_components/badges";

const STATUS_TABS: { value: "" | CampaignStatus; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "draft", label: "Borrador" },
  { value: "scheduled", label: "Programadas" },
  { value: "active", label: "Activas" },
  { value: "completed", label: "Completadas" },
];

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(part?: number, total?: number): string {
  if (!total) return "—";
  return `${Math.round(((part ?? 0) / total) * 100)}%`;
}

export default function CampanasPage() {
  const [status, setStatus] = useState<"" | CampaignStatus>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const filters = useMemo(
    () => ({ status: status || undefined }),
    [status]
  );
  const { data: campaigns, isLoading } = useCampaigns(filters);
  const del = useDeleteCampaign();
  const send = useSendCampaign();

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta campaña?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Campaña eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  async function handleSend(id: string) {
    if (!confirm("¿Enviar campaña ahora? Se notificará a los contactos en la audiencia.")) return;
    try {
      const res = await send.mutateAsync(id);
      toast.success(`Campaña enviada — ${res.queued} destinatarios`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar");
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
            Campañas
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Email, SMS y WhatsApp masivos
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" />
          Nueva campaña
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-warm-border bg-white p-1">
        {STATUS_TABS.map((t) => {
          const active = status === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={
                active
                  ? "rounded-[8px] bg-coral/10 px-3 py-1.5 text-sm font-medium text-coral"
                  : "rounded-[8px] px-3 py-1.5 text-sm text-text-secondary hover:bg-warm-muted hover:text-text-primary"
              }
            >
              {t.label}
            </button>
          );
        })}
        <span className="ml-auto pr-2 text-xs text-text-secondary">
          {campaigns?.length ?? 0} campañas
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-muted/40 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Nombre
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Canal
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Estado
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Programada
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Envíos / Aperturas
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-text-secondary"
                  >
                    Cargando…
                  </td>
                </tr>
              )}
              {!isLoading && (campaigns?.length ?? 0) === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-text-secondary"
                  >
                    <Megaphone className="mx-auto mb-2 h-6 w-6 text-text-secondary/60" />
                    Sin campañas aún. Crea la primera con &ldquo;Nueva
                    campaña&rdquo;.
                  </td>
                </tr>
              )}
              {campaigns?.map((c) => {
                const sent = c.stats?.sent ?? 0;
                const opened = c.stats?.opened ?? 0;
                const canSend =
                  c.status !== "active" && c.status !== "completed";
                return (
                  <tr key={c.id} className="hover:bg-warm-muted/40">
                    <td className="px-4 py-2.5 font-medium text-text-primary">
                      {c.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill meta={CAMPAIGN_TYPE_META[c.type]} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill meta={CAMPAIGN_STATUS_META[c.status]} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                      {fmtDateTime(c.scheduledAt ?? c.startedAt)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                      {sent.toLocaleString("es-ES")}
                      {sent > 0 && (
                        <span className="ml-1 text-sage">
                          · {pct(opened, sent)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {canSend && (
                          <button
                            onClick={() => handleSend(c.id)}
                            className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-sage"
                            aria-label="Enviar"
                            title="Enviar ahora"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral"
                          aria-label="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
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

      <CampaignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
      />
    </div>
  );
}
