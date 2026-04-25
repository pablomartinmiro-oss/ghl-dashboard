"use client";

import { useMemo, useState } from "react";
import { Calculator, Search } from "lucide-react";
import {
  useSizingProfiles,
  useSizingRecommend,
  type SizingRecommendation,
} from "@/hooks/useInventory";

const LEVELS = [
  { value: "", label: "—" },
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
  { value: "expert", label: "Experto" },
];

export default function SizingPage() {
  const [search, setSearch] = useState("");
  const { data: profiles } = useSizingProfiles();
  const recommend = useSizingRecommend();

  const [calc, setCalc] = useState({ heightCm: "", weightKg: "", age: "", level: "" });
  const [result, setResult] = useState<SizingRecommendation | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return profiles ?? [];
    return (profiles ?? []).filter((p) =>
      p.customerEmail.toLowerCase().includes(q) || p.customerName.toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const calculate = async () => {
    const out = await recommend.mutateAsync({
      heightCm: calc.heightCm ? parseInt(calc.heightCm) : null,
      weightKg: calc.weightKg ? parseInt(calc.weightKg) : null,
      age: calc.age ? parseInt(calc.age) : null,
      level: calc.level || null,
    });
    setResult(out.recommendation);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Tallas y Perfiles
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Calculadora de tallas y perfiles guardados de clientes
        </p>
      </div>

      <div className="rounded-2xl border border-warm-border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Calculadora</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumField label="Altura (cm)" value={calc.heightCm} onChange={(v) => setCalc({ ...calc, heightCm: v })} />
          <NumField label="Peso (kg)" value={calc.weightKg} onChange={(v) => setCalc({ ...calc, weightKg: v })} />
          <NumField label="Edad" value={calc.age} onChange={(v) => setCalc({ ...calc, age: v })} />
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Nivel
            <select
              value={calc.level}
              onChange={(e) => setCalc({ ...calc, level: e.target.value })}
              className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-normal text-text-primary"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={calculate}
            disabled={recommend.isPending}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
          >
            <Calculator className="h-4 w-4" /> Calcular
          </button>
          {result && (
            <div className="flex flex-wrap gap-2 text-xs">
              {result.skiLength && (
                <Pill label="Esquí" value={result.skiLength} />
              )}
              {result.bootSize && (
                <Pill label="Bota" value={result.bootSize} />
              )}
              {result.helmetSize && (
                <Pill label="Casco" value={result.helmetSize} />
              )}
              {result.notes && (
                <span className="rounded-[6px] bg-warm-muted px-2 py-1 text-text-secondary">
                  {result.notes}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email o nombre"
          className="w-full rounded-[10px] border border-warm-border bg-white py-2 pl-9 pr-3 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Altura</th>
              <th className="px-3 py-2 text-left">Peso</th>
              <th className="px-3 py-2 text-left">Bota</th>
              <th className="px-3 py-2 text-left">Nivel</th>
              <th className="px-3 py-2 text-left">Esquí rec.</th>
              <th className="px-3 py-2 text-left">Bota rec.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-text-secondary">
                  Sin perfiles guardados
                </td>
              </tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="hover:bg-warm-muted/30">
                <td className="px-3 py-2.5 font-medium text-text-primary">{p.customerName}</td>
                <td className="px-3 py-2.5 text-text-secondary">{p.customerEmail}</td>
                <td className="px-3 py-2.5 text-text-secondary">{p.heightCm ?? "—"}</td>
                <td className="px-3 py-2.5 text-text-secondary">{p.weightKg ?? "—"}</td>
                <td className="px-3 py-2.5 text-text-secondary">{p.shoeSize ?? "—"}</td>
                <td className="px-3 py-2.5 text-text-secondary">{p.level ?? "—"}</td>
                <td className="px-3 py-2.5 text-text-primary">{p.skiLength ?? "—"}</td>
                <td className="px-3 py-2.5 text-text-primary">{p.bootSize ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-normal text-text-primary"
      />
    </label>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-[6px] bg-emerald-100 px-2 py-1 text-emerald-800">
      <span className="font-medium">{label}:</span> {value}
    </span>
  );
}
