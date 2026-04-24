"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  usePromotions,
  useDeletePromotion,
  type Promotion,
} from "@/hooks/useMarketing";
import { PromotionModal } from "../_components/PromotionModal";
import { PROMO_STATUS_META, PROMO_TYPE_LABEL, StatusPill } from "../_components/badges";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function valueDisplay(p: Promotion): string {
  if (p.type === "percentage") return `${p.value ?? 0}%`;
  if (p.type === "fixed") return `${((p.value ?? 0) / 100).toFixed(2)} €`;
  if (p.type === "2x1") return "2x1";
  return "Extra";
}

export default function PromocionesPage() {
  const { data: promotions, isLoading } = usePromotions();
  const del = useDeletePromotion();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: Promotion) {
    setEditing(p);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta promoción?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Promoción eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Código ${code} copiado`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("No se pudo copiar");
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
            Promociones
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Códigos de descuento, ofertas y restricciones
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" />
          Nueva promoción
        </button>
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
                  Código
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Tipo
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Valor
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Validez
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Usos
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                  Estado
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
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-text-secondary"
                  >
                    Cargando…
                  </td>
                </tr>
              )}
              {!isLoading && (promotions?.length ?? 0) === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-text-secondary"
                  >
                    <Tag className="mx-auto mb-2 h-6 w-6 text-text-secondary/60" />
                    Sin promociones aún. Crea la primera con &ldquo;Nueva
                    promoción&rdquo;.
                  </td>
                </tr>
              )}
              {promotions?.map((p) => (
                <tr key={p.id} className="hover:bg-warm-muted/40">
                  <td className="px-4 py-2.5 font-medium text-text-primary">
                    {p.name}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => copyCode(p.code)}
                      className="inline-flex items-center gap-1 rounded-[8px] bg-warm-muted px-2 py-1 font-mono text-xs text-text-primary hover:bg-coral/10 hover:text-coral"
                    >
                      {p.code}
                      {copiedCode === p.code ? (
                        <Check className="h-3 w-3 text-sage" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-secondary">
                    {PROMO_TYPE_LABEL[p.type]}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm font-semibold text-text-primary">
                    {valueDisplay(p)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                    {fmtDate(p.validFrom)} → {fmtDate(p.validUntil)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                    {p.currentUses}
                    {p.maxUses ? `/${p.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill meta={PROMO_STATUS_META[p.status]} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral"
                        aria-label="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-danger"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PromotionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
      />
    </div>
  );
}
