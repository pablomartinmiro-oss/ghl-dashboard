"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import { CATEGORY_LABELS, PRICE_TYPE_LABELS, STATION_LABELS } from "./ProductTable";

function getInitialForm(product: Product | null) {
  if (product) {
    return {
      category: product.category,
      name: product.name,
      description: product.description || "",
      station: product.station || "all",
      personType: product.personType || "",
      tier: product.tier || "",
      includesHelmet: product.includesHelmet,
      price: product.price.toString(),
      priceType: product.priceType,
      isActive: product.isActive,
    };
  }
  return {
    category: "alquiler",
    name: "",
    description: "",
    station: "all",
    personType: "",
    tier: "",
    includesHelmet: false,
    price: "",
    priceType: "per_day",
    isActive: true,
  };
}

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
}

export function ProductModal({ product, isOpen, onClose, onSave }: ProductModalProps) {
  const [form, setForm] = useState(getInitialForm(product));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(product && { id: product.id }),
      category: form.category,
      name: form.name,
      description: form.description || null,
      station: form.station || "all",
      personType: form.personType || null,
      tier: form.tier || null,
      includesHelmet: form.includesHelmet,
      price: parseFloat(form.price) || 0,
      priceType: form.priceType,
      isActive: form.isActive,
    } as Partial<Product>);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {product ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Estación</label>
              <select
                value={form.station}
                onChange={(e) => setForm({ ...form, station: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              >
                {Object.entries(STATION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Tipo persona</label>
              <select
                value={form.personType}
                onChange={(e) => setForm({ ...form, personType: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              >
                <option value="">Sin especificar</option>
                <option value="adulto">Adulto</option>
                <option value="infantil">Infantil</option>
                <option value="baby">Baby</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Calidad</label>
              <select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              >
                <option value="">Sin especificar</option>
                <option value="media">Media calidad</option>
                <option value="alta">Alta calidad</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.includesHelmet}
                  onChange={(e) => setForm({ ...form, includesHelmet: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-coral focus:ring-coral"
                />
                Incluye casco
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Precio base (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Tipo de Precio</label>
              <select
                value={form.priceType}
                onChange={(e) => setForm({ ...form, priceType: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              >
                {Object.entries(PRICE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-border text-coral focus:ring-coral"
            />
            <label htmlFor="isActive" className="text-sm text-text-primary">Producto activo</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover transition-colors"
            >
              {product ? "Guardar Cambios" : "Crear Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
