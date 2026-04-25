"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useSimulatePricing, type SimulationResult } from "@/hooks/useDynamicPricing";
import { useDestinations } from "@/hooks/useWhiteLabel";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export default function SimuladorPage() {
  const { data: destinations } = useDestinations();
  const simulate = useSimulatePricing();

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [basePriceEur, setBasePriceEur] = useState<string>("100");
  const [destinationId, setDestinationId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(in7);
  const [occupancyPct, setOccupancyPct] = useState<number>(50);
  const [groupSize, setGroupSize] = useState<string>("1");
  const [loyaltyTier, setLoyaltyTier] = useState<string>("");
  const [result, setResult] = useState<SimulationResult | null>(null);

  const onSimulate = async () => {
    const cents = Math.round(Number(basePriceEur) * 100);
    if (!cents || cents < 1) return;
    const r = await simulate.mutateAsync({
      basePriceCents: cents,
      destinationId: destinationId || null,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      groupSize: Number(groupSize) || 1,
      loyaltyTier: loyaltyTier || null,
    });
    setResult(r);
  };

  const maxBar = result ? Math.max(...result.points.map((p) => p.basePriceCents)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/precios" className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-coral">
            <ArrowLeft className="h-3 w-3" /> Volver a reglas
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
            Simulador de Precios
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Previsualiza cómo se aplicarán las reglas de yield management.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-warm-border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Precio base (€)">
            <input type="number" min="0" step="0.01" value={basePriceEur} onChange={(e) => setBasePriceEur(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Destino">
            <select value={destinationId} onChange={(e) => setDestinationId(e.target.value)} className={inputCls}>
              <option value="">Sin destino</option>
              {destinations?.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </Field>
          <Field label="Tamaño de grupo">
            <input type="number" min="1" value={groupSize} onChange={(e) => setGroupSize(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Fecha inicio">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Fecha fin">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Nivel de fidelidad">
            <select value={loyaltyTier} onChange={(e) => setLoyaltyTier(e.target.value)} className={inputCls}>
              <option value="">Ninguno</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block">
              <span className="mb-1 flex items-center justify-between text-xs font-medium text-text-secondary">
                <span>Ocupación</span>
                <span className="text-coral">{occupancyPct}%</span>
              </span>
              <input
                type="range" min="0" max="100" value={occupancyPct}
                onChange={(e) => setOccupancyPct(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-warm-muted accent-coral"
              />
            </label>
            <p className="mt-1 text-[11px] text-text-secondary">
              Nota: el simulador usa la ocupación real del destino si está configurado. Este control es referencial.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onSimulate}
            disabled={simulate.isPending || !basePriceEur}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> {simulate.isPending ? "Simulando…" : "Simular"}
          </button>
        </div>
      </div>

      {result && (
        <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
          <div className="border-b border-warm-border bg-warm-muted/50 px-4 py-2 text-xs text-text-secondary">
            {result.points.length} días · base {eur.format(result.basePriceCents / 100)}
            {result.productName && <> · {result.productName}</>}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-warm-muted/30 text-xs font-medium text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-right">Base</th>
                <th className="px-3 py-2 text-right">Final</th>
                <th className="px-3 py-2 text-left">Visualización</th>
                <th className="px-3 py-2 text-left">Reglas aplicadas</th>
                <th className="px-3 py-2 text-right">Ahorro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {result.points.map((p) => {
                const finalPct = maxBar > 0 ? (p.finalPriceCents / maxBar) * 100 : 0;
                const basePct = maxBar > 0 ? (p.basePriceCents / maxBar) * 100 : 0;
                const dt = new Date(p.date);
                const isDiscount = p.savingsPercent > 0;
                return (
                  <tr key={p.date} className="hover:bg-warm-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-text-primary">
                      {dt.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-3 py-2 text-right text-text-secondary">{eur.format(p.basePriceCents / 100)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${isDiscount ? "text-emerald-700" : p.savingsPercent < 0 ? "text-coral" : "text-text-primary"}`}>
                      {eur.format(p.finalPriceCents / 100)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="relative h-4 w-full max-w-[180px] overflow-hidden rounded-full bg-warm-muted/60">
                        <div className="absolute inset-y-0 left-0 bg-zinc-300" style={{ width: `${basePct}%` }} />
                        <div className={`absolute inset-y-0 left-0 ${isDiscount ? "bg-emerald-500" : p.savingsPercent < 0 ? "bg-coral" : "bg-zinc-400"}`} style={{ width: `${finalPct}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {p.rulesApplied.length === 0 ? (
                        <span className="text-xs text-text-secondary">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.rulesApplied.map((r) => (
                            <span key={r.ruleId} className="inline-flex rounded-[6px] bg-warm-muted px-1.5 py-0.5 text-[11px] text-text-primary">
                              {r.name} ({r.deltaCents > 0 ? "+" : ""}{(r.deltaCents / 100).toFixed(2)}€)
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${isDiscount ? "text-emerald-700" : p.savingsPercent < 0 ? "text-coral" : "text-text-secondary"}`}>
                      {p.savingsPercent > 0 ? `-${p.savingsPercent}%` : p.savingsPercent < 0 ? `+${Math.abs(p.savingsPercent)}%` : "0%"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {simulate.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Error al simular: {(simulate.error as Error)?.message}
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
