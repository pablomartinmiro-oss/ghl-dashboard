"use client";

import { useState } from "react";
import {
  useCreatePricingRule,
  useUpdatePricingRule,
  type PricingRule,
  type PricingRuleType,
  type AdjustmentType,
  type RuleInput,
} from "@/hooks/useDynamicPricing";

const TYPE_LABELS: Record<PricingRuleType, string> = {
  early_bird: "Early Bird",
  last_minute: "Last Minute",
  demand: "Demanda",
  day_of_week: "Día de semana",
  group_size: "Tamaño grupo",
  loyalty: "Fidelidad",
  custom: "Personalizada",
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const inputCls = "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm";

export function RuleForm({ initial, onClose }: { initial: PricingRule | null; onClose: () => void }) {
  const create = useCreatePricingRule();
  const update = useUpdatePricingRule();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<PricingRuleType>(initial?.type ?? "early_bird");
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>(initial?.adjustmentType ?? "percentage");
  const [adjustmentValue, setAdjustmentValue] = useState<number>(initial?.adjustmentValue ?? -10);
  const [priority, setPriority] = useState<number>(initial?.priority ?? 0);
  const [stackable, setStackable] = useState<boolean>(initial?.stackable ?? false);
  const [minDaysAdvance, setMinDaysAdvance] = useState<string>(initial?.minDaysAdvance?.toString() ?? "");
  const [maxDaysAdvance, setMaxDaysAdvance] = useState<string>(initial?.maxDaysAdvance?.toString() ?? "");
  const [minOccupancyPct, setMinOccupancyPct] = useState<string>(initial?.minOccupancyPct?.toString() ?? "");
  const [maxOccupancyPct, setMaxOccupancyPct] = useState<string>(initial?.maxOccupancyPct?.toString() ?? "");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.daysOfWeek ?? []);
  const [minGroupSize, setMinGroupSize] = useState<string>(initial?.minGroupSize?.toString() ?? "");
  const [loyaltyTiers, setLoyaltyTiers] = useState<string>(initial?.loyaltyTiers?.join(", ") ?? "");
  const [maxDiscount, setMaxDiscount] = useState<string>(initial?.maxDiscount?.toString() ?? "");
  const [minPrice, setMinPrice] = useState<string>(initial?.minPrice?.toString() ?? "");
  const [validFrom, setValidFrom] = useState<string>(initial?.validFrom?.slice(0, 10) ?? "");
  const [validUntil, setValidUntil] = useState<string>(initial?.validUntil?.slice(0, 10) ?? "");

  const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));
  const dateToISO = (s: string) => (s.trim() === "" ? null : new Date(s).toISOString());

  const onSubmit = async () => {
    const input: RuleInput = {
      name,
      type,
      adjustmentType,
      adjustmentValue,
      priority,
      stackable,
      minDaysAdvance: type === "early_bird" || type === "last_minute" || type === "custom" ? numOrNull(minDaysAdvance) : null,
      maxDaysAdvance: type === "early_bird" || type === "last_minute" || type === "custom" ? numOrNull(maxDaysAdvance) : null,
      minOccupancyPct: type === "demand" || type === "custom" ? numOrNull(minOccupancyPct) : null,
      maxOccupancyPct: type === "demand" || type === "custom" ? numOrNull(maxOccupancyPct) : null,
      daysOfWeek: type === "day_of_week" || type === "custom" ? (daysOfWeek.length > 0 ? daysOfWeek : null) : null,
      minGroupSize: type === "group_size" || type === "custom" ? numOrNull(minGroupSize) : null,
      loyaltyTiers: type === "loyalty" || type === "custom"
        ? (loyaltyTiers.trim() ? loyaltyTiers.split(",").map((t) => t.trim()).filter(Boolean) : null)
        : null,
      maxDiscount: numOrNull(maxDiscount),
      minPrice: numOrNull(minPrice),
      validFrom: dateToISO(validFrom),
      validUntil: dateToISO(validUntil),
    };
    if (initial) await update.mutateAsync({ id: initial.id, ...input });
    else await create.mutateAsync(input);
    onClose();
  };

  const toggleDow = (n: number) =>
    setDaysOfWeek((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort()));

  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">{initial ? "Editar regla" : "Nueva regla"}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <Field label="Tipo">
          <select value={type} onChange={(e) => setType(e.target.value as PricingRuleType)} className={inputCls}>
            {(Object.keys(TYPE_LABELS) as PricingRuleType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de ajuste">
          <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)} className={inputCls}>
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed_cents">Fijo (céntimos)</option>
          </select>
        </Field>
        <Field label={adjustmentType === "percentage" ? "Valor (%, negativo = descuento)" : "Valor (céntimos, negativo = descuento)"}>
          <input type="number" value={adjustmentValue} onChange={(e) => setAdjustmentValue(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Prioridad"><input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className={inputCls} /></Field>
        <Field label="Apilable">
          <label className="flex h-9 items-center gap-2 text-sm">
            <input type="checkbox" checked={stackable} onChange={(e) => setStackable(e.target.checked)} />
            Permitir apilar con otras reglas
          </label>
        </Field>
        {(type === "early_bird" || type === "last_minute" || type === "custom") && (<>
          <Field label="Min. días anticipación"><input value={minDaysAdvance} onChange={(e) => setMinDaysAdvance(e.target.value)} className={inputCls} placeholder="ej. 30" /></Field>
          <Field label="Max. días anticipación"><input value={maxDaysAdvance} onChange={(e) => setMaxDaysAdvance(e.target.value)} className={inputCls} placeholder="ej. 7" /></Field>
        </>)}
        {(type === "demand" || type === "custom") && (<>
          <Field label="Min. ocupación (%)"><input value={minOccupancyPct} onChange={(e) => setMinOccupancyPct(e.target.value)} className={inputCls} /></Field>
          <Field label="Max. ocupación (%)"><input value={maxOccupancyPct} onChange={(e) => setMaxOccupancyPct(e.target.value)} className={inputCls} /></Field>
        </>)}
        {(type === "day_of_week" || type === "custom") && (
          <Field label="Días de la semana">
            <div className="flex gap-1">
              {DAY_LABELS.map((lbl, n) => (
                <button key={n} type="button" onClick={() => toggleDow(n)}
                  className={`h-9 w-10 rounded-[8px] border text-xs font-medium ${daysOfWeek.includes(n) ? "border-coral bg-coral text-white" : "border-warm-border bg-white text-text-secondary"}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </Field>
        )}
        {(type === "group_size" || type === "custom") && (
          <Field label="Tamaño mínimo de grupo"><input value={minGroupSize} onChange={(e) => setMinGroupSize(e.target.value)} className={inputCls} /></Field>
        )}
        {(type === "loyalty" || type === "custom") && (
          <Field label="Niveles de fidelidad (separados por coma)"><input value={loyaltyTiers} onChange={(e) => setLoyaltyTiers(e.target.value)} className={inputCls} placeholder="silver, gold, platinum" /></Field>
        )}
        <Field label="Descuento máximo (céntimos)"><input value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} className={inputCls} /></Field>
        <Field label="Precio mínimo (céntimos)"><input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={inputCls} /></Field>
        <Field label="Válido desde"><input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={inputCls} /></Field>
        <Field label="Válido hasta"><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary hover:bg-warm-muted">Cancelar</button>
        <button
          onClick={onSubmit}
          disabled={!name || create.isPending || update.isPending}
          className="rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
        >
          {initial ? "Guardar" : "Crear"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
