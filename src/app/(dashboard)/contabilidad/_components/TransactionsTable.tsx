"use client";

import { Trash2, Pencil } from "lucide-react";
import { fmtEUR, fmtDate, categoryLabel, isExpenseType, typeLabel } from "./utils";
import type { Transaction } from "@/hooks/useAccounting";

interface TransactionsTableProps {
  transactions: Transaction[] | undefined;
  isLoading: boolean;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

export function TransactionsTable({
  transactions,
  isLoading,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-warm-border bg-white p-6 text-center text-sm text-text-secondary">
        Cargando movimientos…
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-warm-border bg-white p-10 text-center">
        <p className="text-sm font-medium text-text-primary">Sin movimientos</p>
        <p className="mt-1 text-xs text-text-secondary">
          Crea tu primer ingreso o gasto para empezar.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs uppercase tracking-wider text-text-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-left font-medium">Descripción</th>
              <th className="px-4 py-3 text-left font-medium">Categoría</th>
              <th className="px-4 py-3 text-left font-medium">Proveedor</th>
              <th className="px-4 py-3 text-right font-medium">Importe</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {transactions.map((t) => {
              const expense = isExpenseType(t.type);
              const sign = t.type === "refund" ? -1 : expense ? -1 : 1;
              const colorClass = sign < 0 ? "text-warm-danger" : "text-sage";
              return (
                <tr key={t.id} className="hover:bg-warm-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary">
                    {fmtDate(t.date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">
                      {t.description}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {typeLabel(t.type)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-warm-muted px-2 py-0.5 text-xs font-medium text-text-primary">
                      {categoryLabel(t.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {t.supplier?.name ?? "—"}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold ${colorClass}`}>
                    {sign < 0 ? "−" : "+"}
                    {fmtEUR(t.amountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[t.status] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(t)}
                        className="rounded-md p-1.5 text-text-secondary hover:bg-warm-muted hover:text-text-primary"
                        aria-label="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(t.id)}
                        className="rounded-md p-1.5 text-text-secondary hover:bg-warm-danger/10 hover:text-warm-danger"
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
  );
}
