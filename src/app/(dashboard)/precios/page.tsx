"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, TrendingDown } from "lucide-react";
import {
  usePricingRules,
  useUpdatePricingRule,
  useDeletePricingRule,
  type PricingRule,
  type PricingRuleType,
} from "@/hooks/useDynamicPricing";
import { RuleForm } from "./_components/RuleForm";

const TYPE_META: Record<PricingRuleType, { label: string; cls: string }> = {
  early_bird: { label: "Early Bird", cls: "bg-emerald-100 text-emerald-800" },
  last_minute: { label: "Last Minute", cls: "bg-amber-100 text-amber-800" },
  demand: { label: "Demanda", cls: "bg-coral/15 text-coral" },
  day_of_week: { label: "Día de semana", cls: "bg-blue-100 text-blue-800" },
  group_size: { label: "Tamaño grupo", cls: "bg-purple-100 text-purple-800" },
  loyalty: { label: "Fidelidad", cls: "bg-warm-gold/20 text-warm-gold" },
  custom: { label: "Personalizada", cls: "bg-zinc-200 text-zinc-800" },
};

export default function PreciosPage() {
  const { data: rules = [], isLoading } = usePricingRules();
  const updateRule = useUpdatePricingRule();
  const deleteRule = useDeletePricingRule();
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [showForm, setShowForm] = useState(false);

  const activeCount = rules.filter((r) => r.active).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Precios Dinámicos
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">Yield Management</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/precios/simulador"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <TrendingDown className="h-4 w-4" /> Simulador
          </a>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            <Plus className="h-4 w-4" /> Nueva regla
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Reglas activas" value={activeCount} cls="text-emerald-700" />
        <StatCard label="Total reglas" value={rules.length} cls="text-text-primary" />
        <StatCard label="Apilables" value={rules.filter((r) => r.stackable).length} cls="text-coral" />
        <StatCard label="Inactivas" value={rules.length - activeCount} cls="text-zinc-700" />
      </div>

      {showForm && (
        <RuleForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Ajuste</th>
              <th className="px-3 py-2 text-left">Prioridad</th>
              <th className="px-3 py-2 text-left">Apilable</th>
              <th className="px-3 py-2 text-left">Activa</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-text-secondary">Cargando…</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-text-secondary">Sin reglas. Crea la primera regla de yield management.</td></tr>
            ) : rules.map((r) => {
              const type = TYPE_META[r.type];
              const adj = r.adjustmentType === "percentage"
                ? `${r.adjustmentValue > 0 ? "+" : ""}${r.adjustmentValue}%`
                : `${r.adjustmentValue > 0 ? "+" : ""}${(r.adjustmentValue / 100).toFixed(2)} €`;
              return (
                <tr key={r.id} className="hover:bg-warm-muted/30">
                  <td className="px-3 py-2.5 font-medium text-text-primary">{r.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${type.cls}`}>
                      {type.label}
                    </span>
                  </td>
                  <td className={`px-3 py-2.5 font-medium ${r.adjustmentValue < 0 ? "text-emerald-700" : "text-coral"}`}>
                    {adj}
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary">{r.priority}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{r.stackable ? "Sí" : "No"}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => updateRule.mutate({ id: r.id, active: !r.active })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.active ? "bg-emerald-500" : "bg-zinc-300"}`}
                      aria-label="Alternar activa"
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${r.active ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditing(r); setShowForm(true); }}
                        title="Editar"
                        className="rounded-[8px] p-1.5 text-text-secondary hover:bg-warm-muted"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar regla "${r.name}"?`)) deleteRule.mutate(r.id); }}
                        title="Eliminar"
                        className="rounded-[8px] p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
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

function StatCard({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}
