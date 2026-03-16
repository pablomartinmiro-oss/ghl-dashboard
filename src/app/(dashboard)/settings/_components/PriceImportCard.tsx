"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ParsedRow {
  name: string;
  category: string;
  station: string;
  price: number;
  priceType: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "nombre" || h === "name" || h === "producto");
  const catIdx = headers.findIndex((h) => h === "categoría" || h === "categoria" || h === "category");
  const stationIdx = headers.findIndex((h) => h === "estación" || h === "estacion" || h === "station");
  const priceIdx = headers.findIndex((h) => h === "precio" || h === "price");
  const typeIdx = headers.findIndex((h) => h === "tipo_precio" || h === "price_type" || h === "tipo");

  if (nameIdx === -1 || priceIdx === -1) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const price = parseFloat(cols[priceIdx]);
    if (isNaN(price)) continue;

    rows.push({
      name: cols[nameIdx] ?? "",
      category: catIdx >= 0 ? (cols[catIdx] ?? "") : "",
      station: stationIdx >= 0 ? (cols[stationIdx] ?? "all") : "all",
      price,
      priceType: typeIdx >= 0 ? (cols[typeIdx] ?? "fixed") : "fixed",
    });
  }
  return rows;
}

export function PriceImportCard() {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Solo se admiten archivos .csv");
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      toast.error("No se encontraron filas válidas. Asegúrate de incluir columnas: nombre, precio");
      return;
    }
    setPreview(rows);
    toast.success(`${rows.length} productos encontrados`);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = useCallback(async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await fetch("/api/products/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: preview }),
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      toast.success(`${data.imported} productos importados correctamente`);
      setPreview(null);
      setFileName(null);
    } catch {
      toast.error("Error al importar los productos");
    } finally {
      setImporting(false);
    }
  }, [preview]);

  const handleCancel = useCallback(() => {
    setPreview(null);
    setFileName(null);
  }, []);

  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-coral" />
          <h3 className="text-lg font-semibold text-text-primary">Importar Tarifas</h3>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {!preview ? (
          <>
            <p className="text-sm text-text-secondary">
              Sube un archivo CSV con los precios de tus productos. Columnas requeridas: <strong>nombre</strong>, <strong>precio</strong>.
              Opcionales: categoría, estación, tipo_precio.
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition-colors ${
                dragOver ? "border-coral bg-coral-light/20" : "border-border bg-surface/30"
              }`}
            >
              <Upload className="h-8 w-8 text-text-secondary mb-3" />
              <p className="text-sm font-medium text-text-primary">
                Arrastra un archivo aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-text-secondary mt-1">Formato admitido: .csv</p>
              <label className="mt-4 cursor-pointer rounded-lg border border-coral px-4 py-2 text-sm font-medium text-coral hover:bg-coral-light transition-colors">
                Seleccionar archivo
                <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
              </label>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Formato esperado</h4>
              <code className="block text-xs text-text-secondary bg-surface rounded p-2">
                nombre,categoría,estación,precio,tipo_precio{"\n"}
                Esquí Adulto Alta Calidad,alquiler,baqueira,36,per_day{"\n"}
                Forfait Adulto,forfait,sierra_nevada,45,per_day
              </code>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-sage" />
                <span className="text-sm font-medium text-text-primary">
                  {fileName} — {preview.length} productos
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 w-7 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface/50 border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Producto</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Categoría</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Estación</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-text-primary">{row.name}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.category || "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.station}</td>
                      <td className="px-3 py-2 text-right font-medium text-text-primary">
                        {row.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && (
                <div className="px-3 py-2 text-xs text-text-secondary text-center bg-surface/50">
                  ... y {preview.length - 20} más
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gold" />
              <span className="text-xs text-text-secondary">
                Los productos existentes con el mismo nombre se actualizarán. Los nuevos se crearán.
              </span>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleImport} disabled={importing} className="gap-2 bg-coral text-white hover:bg-coral-hover">
                <Upload className="h-4 w-4" />
                {importing ? "Importando..." : `Importar ${preview.length} productos`}
              </Button>
              <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
