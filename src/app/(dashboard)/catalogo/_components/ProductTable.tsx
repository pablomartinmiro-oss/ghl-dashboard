"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Sun, Snowflake, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import type { Season, DayPricingMatrix, PrivateLessonMatrix } from "@/lib/pricing/types";

const CATEGORY_LABELS: Record<string, string> = {
  alquiler: "Alquiler Material",
  escuela: "Escuela (Cursos Colectivos)",
  clase_particular: "Clases Particulares",
  forfait: "Forfaits",
  locker: "Lockers / Guardaropa",
  apreski: "Après-ski / Actividades",
  menu: "Menú / Restauración",
  snowcamp: "SnowCamp / Guardería",
  taxi: "Transfers / Taxi",
  pack: "Packs All-in-One",
};

const PRICE_TYPE_LABELS: Record<string, string> = {
  per_day: "/día",
  per_person_per_hour: "/hora/pers.",
  per_session: "/sesión",
  fixed: "fijo",
  bundle: "pack",
};

const STATION_LABELS: Record<string, string> = {
  baqueira: "Baqueira Beret",
  sierra_nevada: "Sierra Nevada",
  valdesqui: "Valdesquí",
  la_pinilla: "La Pinilla",
  grandvalira: "Grandvalira",
  formigal: "Formigal",
  alto_campoo: "Alto Campoo",
  all: "Todas",
};

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAdd: () => void;
}

function getPriceDisplay(product: Product, season: Season): string {
  if (!product.pricingMatrix) return EUR.format(product.price);
  const matrix = product.pricingMatrix as unknown;

  // Bundle products show "Ver componentes" instead of a price
  if (product.priceType === "bundle") return "Ver componentes";

  if (product.category === "clase_particular") {
    const m = matrix as PrivateLessonMatrix;
    const s = m[season];
    if (s?.["1h"]?.["1p"] !== undefined) return `desde ${EUR.format(s["1h"]["1p"])}`;
    return EUR.format(product.price);
  }

  const m = matrix as DayPricingMatrix;
  const s = m[season];
  if (s?.["1"] !== undefined) return EUR.format(s["1"]);
  return EUR.format(product.price);
}

export function ProductTable({ products, onEdit, onDelete, onAdd }: ProductTableProps) {
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStation, setFilterStation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [season, setSeason] = useState<Season>("media");
  const categories = Object.keys(CATEGORY_LABELS);

  let filtered = filterCategory
    ? products.filter((p) => p.category === filterCategory)
    : products;

  if (filterStation) {
    filtered = filtered.filter((p) => p.station === filterStation || p.station === "all");
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
  }

  const grouped = filtered.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Catálogo de Productos</h1>
          <p className="text-sm text-text-secondary mt-1">
            {products.length} productos en el catálogo
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Season toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setSeason("media")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                season === "media" ? "bg-sage text-white" : "bg-white text-text-secondary hover:bg-surface"
              )}
            >
              <Sun className="h-3.5 w-3.5" />
              T. Media
            </button>
            <button
              onClick={() => setSeason("alta")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                season === "alta" ? "bg-coral text-white" : "bg-white text-text-secondary hover:bg-surface"
              )}
            >
              <Snowflake className="h-3.5 w-3.5" />
              T. Alta
            </button>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 rounded-lg bg-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            Añadir Producto
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-border bg-white pl-10 pr-3 py-1.5 text-sm placeholder:text-text-secondary focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral w-48"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory("")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              !filterCategory ? "bg-coral text-white" : "bg-white text-text-secondary border border-border hover:bg-surface"
            )}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                filterCategory === cat ? "bg-coral text-white" : "bg-white text-text-secondary border border-border hover:bg-surface"
              )}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <select
          value={filterStation}
          onChange={(e) => setFilterStation(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-coral focus:outline-none"
        >
          <option value="">Todas las estaciones</option>
          {Object.entries(STATION_LABELS).filter(([k]) => k !== "all").map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Tables by category */}
      {Object.keys(grouped).length === 0 && (
        <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-12 text-center">
          <p className="text-sm text-text-secondary">No se encontraron productos</p>
          <p className="text-xs text-text-secondary mt-1">Prueba a cambiar los filtros o añade un nuevo producto</p>
        </div>
      )}
      {Object.entries(grouped).map(([category, categoryProducts]) => (
        <div key={category} className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-text-primary">
              {CATEGORY_LABELS[category] || category}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Estación</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Precio ({season === "alta" ? "Alta" : "Media"})
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categoryProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-surface/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-text-primary">{product.name}</div>
                      <div className="flex gap-1.5 mt-1">
                        {product.personType && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                            {product.personType}
                          </span>
                        )}
                        {product.tier && (
                          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                            {product.tier === "alta_quality" || product.tier === "alta" ? "Alta calidad" : "Media calidad"}
                          </span>
                        )}
                        {product.includesHelmet && (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">+ casco</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {STATION_LABELS[product.station] || product.station}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-sm text-text-primary">{getPriceDisplay(product, season)}</span>
                      <span className="text-xs text-text-secondary ml-1">{PRICE_TYPE_LABELS[product.priceType] || product.priceType}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        product.isActive ? "bg-sage-light text-sage" : "bg-muted-red-light text-muted-red"
                      )}>
                        {product.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onEdit(product)} className="rounded-lg p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral transition-colors" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDelete(product)} className="rounded-lg p-1.5 text-text-secondary hover:bg-red-50 hover:text-danger transition-colors" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export { CATEGORY_LABELS, PRICE_TYPE_LABELS, STATION_LABELS };
