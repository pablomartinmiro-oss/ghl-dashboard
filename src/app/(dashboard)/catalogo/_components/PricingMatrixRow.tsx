"use client";

import { Sun, Snowflake } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import type { DayPricingMatrix, PrivateLessonMatrix } from "@/lib/pricing/types";

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

interface PricingMatrixRowProps {
  product: Product;
}

/** Inline expanded matrix for day-based products (alquiler, forfait, escuela, locker, etc.) */
function DayMatrix({ matrix }: { matrix: DayPricingMatrix }) {
  const allDays = new Set<string>();
  if (matrix.media) Object.keys(matrix.media).forEach((d) => allDays.add(d));
  if (matrix.alta) Object.keys(matrix.alta).forEach((d) => allDays.add(d));
  const days = [...allDays].map(Number).sort((a, b) => a - b);

  if (days.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="px-2 py-1.5 text-left text-text-secondary font-medium w-20">Temporada</th>
            {days.map((d) => (
              <th key={d} className="px-2 py-1.5 text-right text-text-secondary font-medium">
                {d} {d === 1 ? "día" : "días"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50">
            <td className="px-2 py-1.5">
              <span className="inline-flex items-center gap-1 text-sage font-medium">
                <Sun className="h-3 w-3" /> Media
              </span>
            </td>
            {days.map((d) => (
              <td key={d} className="px-2 py-1.5 text-right text-text-primary font-medium">
                {matrix.media?.[String(d)] !== undefined ? EUR.format(matrix.media[String(d)]) : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="px-2 py-1.5">
              <span className="inline-flex items-center gap-1 text-coral font-medium">
                <Snowflake className="h-3 w-3" /> Alta
              </span>
            </td>
            {days.map((d) => (
              <td key={d} className="px-2 py-1.5 text-right text-text-primary font-medium">
                {matrix.alta?.[String(d)] !== undefined ? EUR.format(matrix.alta[String(d)]) : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Matrix for private lessons: hours × people */
function LessonMatrix({ matrix }: { matrix: PrivateLessonMatrix }) {
  const allHours = new Set<string>();
  const allPeople = new Set<string>();
  for (const season of ["media", "alta"] as const) {
    const s = matrix[season];
    if (!s) continue;
    Object.keys(s).forEach((h) => {
      allHours.add(h);
      Object.keys(s[h]).forEach((p) => allPeople.add(p));
    });
  }
  const hours = [...allHours].sort();
  const people = [...allPeople].sort();

  if (hours.length === 0) return null;

  return (
    <div className="space-y-3">
      {(["media", "alta"] as const).map((season) => {
        const s = matrix[season];
        if (!s) return null;
        return (
          <div key={season}>
            <div className="flex items-center gap-1 mb-1">
              {season === "alta" ? (
                <span className="inline-flex items-center gap-1 text-xs text-coral font-medium">
                  <Snowflake className="h-3 w-3" /> Alta
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-sage font-medium">
                  <Sun className="h-3 w-3" /> Media
                </span>
              )}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-1 text-left text-text-secondary font-medium w-16"></th>
                  {people.map((p) => (
                    <th key={p} className="px-2 py-1 text-right text-text-secondary font-medium">
                      {p.replace("p", " pers.")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h} className="border-b border-border/50">
                    <td className="px-2 py-1 text-text-secondary font-medium">{h.replace("h", " hora")}</td>
                    {people.map((p) => (
                      <td key={p} className="px-2 py-1 text-right text-text-primary font-medium">
                        {s[h]?.[p] !== undefined ? EUR.format(s[h][p]) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/** Bundle products show their component list */
function BundleInfo({ matrix }: { matrix: unknown }) {
  const m = matrix as Record<string, unknown>;
  const components = (m.components as string[]) || [];
  if (components.length === 0) return <span className="text-xs text-text-secondary">Sin componentes</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {components.map((c) => (
        <span key={c} className="rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium text-text-secondary">
          {c}
        </span>
      ))}
    </div>
  );
}

function isPrivateLessonMatrix(matrix: unknown): matrix is PrivateLessonMatrix {
  if (!matrix || typeof matrix !== "object") return false;
  const m = matrix as Record<string, unknown>;
  for (const season of ["media", "alta"]) {
    const s = m[season];
    if (!s || typeof s !== "object") continue;
    const keys = Object.keys(s as Record<string, unknown>);
    if (keys.some((k) => k.endsWith("h"))) return true;
  }
  return false;
}

function isBundleMatrix(matrix: unknown): boolean {
  if (!matrix || typeof matrix !== "object") return false;
  return (matrix as Record<string, unknown>).type === "bundle";
}

export function PricingMatrixRow({ product }: PricingMatrixRowProps) {
  if (!product.pricingMatrix) {
    return (
      <span className="text-xs text-text-secondary">
        Precio fijo: {EUR.format(product.price)}
      </span>
    );
  }

  if (isBundleMatrix(product.pricingMatrix)) {
    return <BundleInfo matrix={product.pricingMatrix} />;
  }

  if (product.category === "clase_particular" && isPrivateLessonMatrix(product.pricingMatrix)) {
    return <LessonMatrix matrix={product.pricingMatrix as PrivateLessonMatrix} />;
  }

  return <DayMatrix matrix={product.pricingMatrix as unknown as DayPricingMatrix} />;
}
