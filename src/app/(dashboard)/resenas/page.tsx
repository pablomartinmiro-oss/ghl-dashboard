"use client";

import { useMemo, useState } from "react";
import { Check, X, Sparkles, MessageCircle, Send } from "lucide-react";
import {
  useReviews,
  useReviewStats,
  useUpdateReview,
  type Review,
  type ReviewStatus,
} from "@/hooks/useReviews";
import { useDestinations } from "@/hooks/useWhiteLabel";
import { StarRating } from "./_components/StarRating";
import { StatsCards } from "./_components/StatsCards";
import { ResponseModal } from "./_components/ResponseModal";
import { RequestModal } from "./_components/RequestModal";

const STATUS_META: Record<ReviewStatus, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Aprobada", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rechazada", cls: "bg-red-100 text-red-800" },
  featured: { label: "Destacada", cls: "bg-purple-100 text-purple-800" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ResenasPage() {
  const [status, setStatus] = useState<string>("");
  const [rating, setRating] = useState<string>("");
  const [destinationId, setDestinationId] = useState<string>("");

  const { data: reviews } = useReviews({ status, rating, destinationId });
  const { data: stats } = useReviewStats();
  const { data: destinations } = useDestinations();
  const update = useUpdateReview();

  const [responseTarget, setResponseTarget] = useState<Review | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  const distribution = useMemo(() => {
    const d = stats?.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const max = Math.max(1, ...Object.values(d));
    return [5, 4, 3, 2, 1].map((s) => {
      const k = String(s) as "1" | "2" | "3" | "4" | "5";
      const count = d[k] ?? 0;
      return { star: s, count, pct: Math.round((count / max) * 100) };
    });
  }, [stats]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Reseñas
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Gestión de opiniones de clientes
          </p>
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Send className="h-4 w-4" /> Solicitar reseña
        </button>
      </div>

      <StatsCards stats={stats} />

      <div className="rounded-2xl border border-warm-border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Distribución de valoraciones
        </h2>
        <div className="space-y-1.5">
          {distribution.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="w-8 text-xs font-medium text-text-secondary">
                {star} ★
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-warm-muted">
                <div
                  className="h-full rounded-full bg-coral transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-medium text-text-secondary">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobada</option>
          <option value="rejected">Rechazada</option>
          <option value="featured">Destacada</option>
        </select>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
        >
          <option value="">Todas las valoraciones</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} estrellas
            </option>
          ))}
        </select>
        <select
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los destinos</option>
          {destinations?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Valoración</th>
              <th className="px-3 py-2 text-left">Título</th>
              <th className="px-3 py-2 text-left">Destino</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {(reviews ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-12 text-center text-sm text-text-secondary"
                >
                  Sin reseñas para los filtros seleccionados
                </td>
              </tr>
            ) : (
              reviews?.map((r) => {
                const meta = STATUS_META[r.status];
                return (
                  <tr key={r.id} className="hover:bg-warm-muted/30">
                    <td className="px-3 py-2.5 font-medium text-text-primary">
                      {r.customerName}
                    </td>
                    <td className="px-3 py-2.5">
                      <StarRating value={r.rating} size="sm" />
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-2.5 text-text-primary">
                      {r.title ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {r.destination?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <ActionBtn
                          title="Aprobar"
                          color="text-emerald-600 hover:bg-emerald-50"
                          onClick={() =>
                            update.mutate({ id: r.id, status: "approved" })
                          }
                        >
                          <Check className="h-4 w-4" />
                        </ActionBtn>
                        <ActionBtn
                          title="Rechazar"
                          color="text-red-600 hover:bg-red-50"
                          onClick={() =>
                            update.mutate({ id: r.id, status: "rejected" })
                          }
                        >
                          <X className="h-4 w-4" />
                        </ActionBtn>
                        <ActionBtn
                          title="Destacar"
                          color="text-purple-600 hover:bg-purple-50"
                          onClick={() =>
                            update.mutate({ id: r.id, status: "featured" })
                          }
                        >
                          <Sparkles className="h-4 w-4" />
                        </ActionBtn>
                        <ActionBtn
                          title="Responder"
                          color="text-text-secondary hover:bg-warm-muted"
                          onClick={() => setResponseTarget(r)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ResponseModal
        review={responseTarget}
        onClose={() => setResponseTarget(null)}
      />
      <RequestModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}

function ActionBtn({
  title,
  color,
  onClick,
  children,
}: {
  title: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-[8px] p-1.5 transition-colors ${color}`}
    >
      {children}
    </button>
  );
}
