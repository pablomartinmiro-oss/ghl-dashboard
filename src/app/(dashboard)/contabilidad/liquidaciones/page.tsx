"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  useSettlements,
  useSettlement,
  useCreateSettlement,
  useUpdateSettlement,
  type SupplierSettlement,
} from "@/hooks/useAccounting";
import { useSuppliers } from "@/hooks/useWhiteLabel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fmtEUR,
  fmtDate,
  toISODate,
  settlementStatusBadge,
  categoryLabel,
  typeLabel,
} from "../_components/utils";
import { cn } from "@/lib/utils";

const STATUS_FLOW = ["draft", "sent", "confirmed", "paid"] as const;
type SettlementStatus = (typeof STATUS_FLOW)[number];

function nextStatus(s: string): SettlementStatus | null {
  const idx = STATUS_FLOW.indexOf(s as SettlementStatus);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

const NEXT_ACTION_LABEL: Record<SettlementStatus, string> = {
  draft: "Marcar borrador",
  sent: "Marcar como enviada",
  confirmed: "Confirmar",
  paid: "Marcar como pagada",
};

export default function LiquidacionesPage() {
  const { data: settlements, isLoading } = useSettlements();
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/contabilidad"
            className="rounded-[10px] border border-warm-border bg-white p-2 text-text-secondary hover:bg-warm-muted hover:text-text-primary"
            aria-label="Volver a Contabilidad"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Liquidaciones de Proveedores
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Cierres periódicos con comisión y neto por pagar
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" />
          Nueva liquidación
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-warm-border bg-white p-6 text-center text-sm text-text-secondary">
          Cargando liquidaciones…
        </div>
      ) : !settlements || settlements.length === 0 ? (
        <div className="rounded-2xl border border-warm-border bg-white p-10 text-center">
          <p className="text-sm font-medium text-text-primary">Sin liquidaciones</p>
          <p className="mt-1 text-xs text-text-secondary">
            Crea una liquidación seleccionando un proveedor y un período.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-muted/50 text-xs uppercase tracking-wider text-text-secondary">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="px-4 py-3 text-left font-medium">Proveedor</th>
                  <th className="px-4 py-3 text-left font-medium">Periodo</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Comisión %</th>
                  <th className="px-4 py-3 text-right font-medium">Comisión €</th>
                  <th className="px-4 py-3 text-right font-medium">Neto</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border">
                {settlements.map((s) => (
                  <SettlementRow
                    key={s.id}
                    settlement={s}
                    expanded={expandedId === s.id}
                    onToggle={() =>
                      setExpandedId((cur) => (cur === s.id ? null : s.id))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <CreateSettlementModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function SettlementRow({
  settlement,
  expanded,
  onToggle,
}: {
  settlement: SupplierSettlement;
  expanded: boolean;
  onToggle: () => void;
}) {
  const update = useUpdateSettlement();
  const detail = useSettlement(expanded ? settlement.id : null);
  const badge = settlementStatusBadge(settlement.status);
  const next = nextStatus(settlement.status);

  async function advance() {
    if (!next) return;
    try {
      await update.mutateAsync({ id: settlement.id, status: next });
      toast.success(`Estado: ${settlementStatusBadge(next).label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  return (
    <>
      <tr className="hover:bg-warm-muted/30">
        <td className="px-3 py-3">
          <button
            onClick={onToggle}
            className="rounded-md p-1 text-text-secondary hover:bg-warm-muted hover:text-text-primary"
            aria-label={expanded ? "Contraer" : "Expandir"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-3 font-medium text-text-primary">
          {settlement.supplier?.name ?? "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary">
          {fmtDate(settlement.periodStart)} → {fmtDate(settlement.periodEnd)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-text-primary">
          {fmtEUR(settlement.totalCents)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-text-secondary">
          {settlement.commissionPct.toFixed(1)}%
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-warm-danger">
          {fmtEUR(settlement.commissionCents)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-sage">
          {fmtEUR(settlement.netCents)}
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
              badge.className
            )}
          >
            {badge.label}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {next ? (
            <button
              onClick={advance}
              disabled={update.isPending}
              className="rounded-md bg-coral/10 px-2 py-1 text-xs font-medium text-coral hover:bg-coral/15 disabled:opacity-50"
            >
              {NEXT_ACTION_LABEL[next]}
            </button>
          ) : (
            <span className="text-xs text-text-secondary">—</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} className="bg-warm-muted/20 px-6 py-4">
            {detail.isLoading ? (
              <p className="text-xs text-text-secondary">Cargando detalle…</p>
            ) : detail.data ? (
              <div className="space-y-3">
                {settlement.notes && (
                  <div className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">Notas: </span>
                    {settlement.notes}
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Movimientos del periodo ({detail.data.items.length})
                  </p>
                  {detail.data.items.length === 0 ? (
                    <p className="text-xs text-text-secondary">
                      No hay movimientos confirmados para este proveedor en este periodo.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-warm-border bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-warm-muted/40 text-[10px] uppercase tracking-wider text-text-secondary">
                          <tr>
                            <th className="px-3 py-2 text-left">Fecha</th>
                            <th className="px-3 py-2 text-left">Descripción</th>
                            <th className="px-3 py-2 text-left">Tipo</th>
                            <th className="px-3 py-2 text-left">Categoría</th>
                            <th className="px-3 py-2 text-right">Importe</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-warm-border">
                          {detail.data.items.map((it) => (
                            <tr key={it.id}>
                              <td className="whitespace-nowrap px-3 py-2 font-mono text-text-secondary">
                                {fmtDate(it.date)}
                              </td>
                              <td className="px-3 py-2 text-text-primary">
                                {it.description}
                              </td>
                              <td className="px-3 py-2 text-text-secondary">
                                {typeLabel(it.type)}
                              </td>
                              <td className="px-3 py-2 text-text-secondary">
                                {categoryLabel(it.category)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-text-primary">
                                {fmtEUR(it.amountCents)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {settlement.paidAt && (
                  <p className="text-xs text-text-secondary">
                    Pagada el {fmtDate(settlement.paidAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-warm-danger">
                No se pudo cargar el detalle.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CreateSettlementModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: suppliers } = useSuppliers();
  const create = useCreateSettlement();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [supplierId, setSupplierId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>(toISODate(firstDay));
  const [periodEnd, setPeriodEnd] = useState<string>(toISODate(lastDay));
  const [commissionPct, setCommissionPct] = useState<string>("10");
  const [notes, setNotes] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Selecciona un proveedor");
      return;
    }
    const pct = parseFloat(commissionPct.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error("Comisión inválida (0-100)");
      return;
    }

    try {
      await create.mutateAsync({
        supplierId,
        periodStart: new Date(`${periodStart}T00:00:00`).toISOString(),
        periodEnd: new Date(`${periodEnd}T23:59:59.999`).toISOString(),
        commissionPct: pct,
        notes: notes.trim() || null,
      });
      toast.success("Liquidación creada");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva liquidación</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Proveedor">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
              required
            >
              <option value="">Selecciona un proveedor</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde">
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
                required
              />
            </Field>
            <Field label="Hasta">
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
                required
              />
            </Field>
          </div>
          <Field label="Comisión %">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 font-mono text-sm"
              required
            />
          </Field>
          <Field label="Notas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
            />
          </Field>
          <p className="text-xs text-text-secondary">
            El total, la comisión € y el neto se calcularán automáticamente a partir
            de los movimientos confirmados del proveedor en el periodo seleccionado.
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-warm-border bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
            >
              Crear liquidación
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
