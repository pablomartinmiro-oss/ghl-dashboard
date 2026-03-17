"use client";

import { useState } from "react";
import { Database, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SeedCatalogCard() {
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<{ products: number; seasons: number } | null>(null);

  const handleSeed = async () => {
    if (!confirm("¿Sembrar el catálogo completo 2025/2026? Esto eliminará TODOS los productos y temporadas actuales y los reemplazará con los 93 productos del catálogo Skicenter.")) {
      return;
    }

    setSeeding(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed-products", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Seed failed");
      }
      const data = await res.json();
      setResult({ products: data.products, seasons: data.seasons });
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al sembrar el catálogo");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-coral" />
          <h3 className="text-lg font-semibold text-text-primary">Catálogo Skicenter</h3>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-text-secondary">
          Importa el catálogo completo de la temporada 2025/2026 con 93 productos y 7 periodos de temporada.
          Incluye: alquiler, forfaits, escuela, clases particulares, lockers, après-ski, menú, snowcamp, taxi y packs.
        </p>

        <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3">
          <AlertTriangle className="h-4 w-4 text-gold mt-0.5 shrink-0" />
          <p className="text-xs text-text-secondary">
            Esta acción <strong>eliminará</strong> todos los productos y periodos de temporada existentes para tu cuenta
            y los reemplazará con el catálogo Skicenter completo. Los presupuestos y reservas existentes no se verán afectados.
          </p>
        </div>

        {result && (
          <div className="flex items-center gap-2 rounded-lg border border-sage/30 bg-sage/5 p-3">
            <CheckCircle className="h-4 w-4 text-sage shrink-0" />
            <p className="text-sm text-text-primary">
              Catálogo importado: <strong>{result.products} productos</strong> y <strong>{result.seasons} periodos</strong> de temporada.
            </p>
          </div>
        )}

        <Button
          onClick={handleSeed}
          disabled={seeding}
          className="gap-2 bg-coral text-white hover:bg-coral-hover"
        >
          {seeding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sembrando catálogo...
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              Sembrar Catálogo 2025/2026
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
