"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import type { Upsell } from "@/lib/quotes/auto-package";

export interface EditableItem {
  id?: string;
  productId: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

interface PackageTableProps {
  items: EditableItem[];
  upsells: Upsell[];
  products: Product[];
  showAddProduct: boolean;
  onToggleAddProduct: () => void;
  onUpdateItem: (index: number, field: keyof EditableItem, value: number) => void;
  onRemoveItem: (index: number) => void;
  onAddProduct: (product: Product) => void;
  onAddUpsell: (upsell: Upsell) => void;
}

export function PackageTable({
  items, upsells, products, showAddProduct,
  onToggleAddProduct, onUpdateItem, onRemoveItem, onAddProduct, onAddUpsell,
}: PackageTableProps) {
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const availableProducts = products.filter(
    (p) => p.isActive && !items.some((item) => item.productId === p.id)
  );

  return (
    <div className="flex-1 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Paquete</h3>
        <button onClick={onToggleAddProduct} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface transition-colors">
          <Plus className="h-3.5 w-3.5" /> Añadir producto
        </button>
      </div>

      {showAddProduct && (
        <div className="mb-4 rounded-lg border border-border bg-white shadow-lg max-h-48 overflow-y-auto">
          {availableProducts.map((product) => (
            <button key={product.id} onClick={() => onAddProduct(product)} className="flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-surface transition-colors">
              <span className="text-text-primary">{product.name}</span>
              <span className="text-text-secondary">{product.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface/50 border-b border-border">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Producto</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-text-secondary w-20">Cant.</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary w-24">P. Unit.</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-text-secondary w-20">Dto. %</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary w-24">Total</th>
              <th className="px-4 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-surface/30">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-text-primary">{item.name}</div>
                  {item.description && <div className="text-xs text-text-secondary">{item.description}</div>}
                </td>
                <td className="px-4 py-3">
                  <input type="number" min="1" value={item.quantity} onChange={(e) => onUpdateItem(index, "quantity", parseInt(e.target.value) || 1)} className="w-full rounded border border-border px-2 py-1 text-center text-sm focus:border-coral focus:outline-none" />
                </td>
                <td className="px-4 py-3">
                  <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => onUpdateItem(index, "unitPrice", parseFloat(e.target.value) || 0)} className="w-full rounded border border-border px-2 py-1 text-right text-sm focus:border-coral focus:outline-none" />
                </td>
                <td className="px-4 py-3">
                  <input type="number" min="0" max="100" value={item.discount} onChange={(e) => onUpdateItem(index, "discount", parseFloat(e.target.value) || 0)} className="w-full rounded border border-border px-2 py-1 text-center text-sm focus:border-coral focus:outline-none" />
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-text-primary">
                  {item.totalPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => onRemoveItem(index)} className="rounded p-1 text-text-secondary hover:text-danger transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-border bg-surface/50 px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-semibold text-text-primary">TOTAL</span>
          <span className="text-lg font-bold text-coral">
            {totalAmount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
          </span>
        </div>
      </div>

      {upsells.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Sugerencias</h4>
          <div className="flex flex-wrap gap-2">
            {upsells.map((upsell) => (
              <button key={upsell.product.id} onClick={() => onAddUpsell(upsell)} className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm hover:border-coral hover:bg-coral-light/30 transition-colors">
                <Plus className="h-3.5 w-3.5 text-coral" />
                <span className="text-text-primary">{upsell.product.name}</span>
                <span className="text-text-secondary">{upsell.product.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
