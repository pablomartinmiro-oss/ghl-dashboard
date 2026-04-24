"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Receipt, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  useTransactions,
  useAccountingSummary,
  useDeleteTransaction,
  type Transaction,
  type TransactionFilters,
} from "@/hooks/useAccounting";
import { useSuppliers } from "@/hooks/useWhiteLabel";
import { SummaryCards } from "./_components/SummaryCards";
import { TransactionsTable } from "./_components/TransactionsTable";
import { CategoryBreakdown } from "./_components/CategoryBreakdown";
import { TransactionModal } from "./_components/TransactionModal";
import {
  presetToRange,
  toISODate,
  TX_TYPES,
  type RangePreset,
} from "./_components/utils";
import { cn } from "@/lib/utils";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "este_mes", label: "Este mes" },
  { value: "mes_anterior", label: "Mes anterior" },
  { value: "trimestre", label: "Trimestre" },
  { value: "anio", label: "Año" },
];

export default function ContabilidadPage() {
  const initialRange = useMemo(() => presetToRange("este_mes"), []);

  const [preset, setPreset] = useState<RangePreset>("este_mes");
  const [from, setFrom] = useState<string>(toISODate(new Date(initialRange.from)));
  const [to, setTo] = useState<string>(toISODate(new Date(initialRange.to)));
  const [supplierId, setSupplierId] = useState<string>("");
  const [type, setType] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const filters: TransactionFilters = useMemo(() => {
    const fromISO = new Date(`${from}T00:00:00`).toISOString();
    const toISO = new Date(`${to}T23:59:59.999`).toISOString();
    return {
      from: fromISO,
      to: toISO,
      supplierId: supplierId || undefined,
      type: type || undefined,
    };
  }, [from, to, supplierId, type]);

  const summaryFilters = useMemo(
    () => ({ from: filters.from, to: filters.to, supplierId: filters.supplierId }),
    [filters.from, filters.to, filters.supplierId]
  );

  const { data: transactions, isLoading: txLoading } = useTransactions(filters);
  const { data: summary, isLoading: summaryLoading } = useAccountingSummary(summaryFilters);
  const { data: suppliers } = useSuppliers();
  const deleteTx = useDeleteTransaction();

  function applyPreset(p: RangePreset) {
    setPreset(p);
    const { from: f, to: t } = presetToRange(p);
    setFrom(toISODate(new Date(f)));
    setTo(toISODate(new Date(t)));
  }

  function onDateChange(which: "from" | "to", v: string) {
    setPreset("custom");
    if (which === "from") setFrom(v);
    else setTo(v);
  }

  function handleAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function handleEdit(t: Transaction) {
    setEditing(t);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      await deleteTx.mutateAsync(id);
      toast.success("Movimiento eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Contabilidad
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">Control financiero</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/contabilidad/liquidaciones"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <Receipt className="h-4 w-4" />
            Liquidaciones
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            <Plus className="h-4 w-4" />
            Nuevo movimiento
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 rounded-2xl border border-warm-border bg-white p-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => applyPreset(p.value)}
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors",
                preset === p.value
                  ? "bg-coral text-white"
                  : "text-text-secondary hover:bg-warm-muted hover:text-text-primary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => onDateChange("from", e.target.value)}
              className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            Hasta
            <input
              type="date"
              value={to}
              onChange={(e) => onDateChange("to", e.target.value)}
              className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Todos los proveedores</option>
            {suppliers?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-[10px] border border-warm-border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Todos los tipos</option>
            {TX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards summary={summary} isLoading={summaryLoading} />

      {/* Category breakdown */}
      <CategoryBreakdown summary={summary} />

      {/* Transactions table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Movimientos</h2>
          <span className="text-xs text-text-secondary">
            {transactions?.length ?? 0} movimientos
          </span>
        </div>
        <TransactionsTable
          transactions={transactions}
          isLoading={txLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
      />
    </div>
  );
}
