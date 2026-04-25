"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import {
  useAvailability,
  useInventoryCategories,
  useCreateReservation,
} from "@/hooks/useInventory";
import { useDestinations } from "@/hooks/useWhiteLabel";

function colorForCount(n: number): string {
  if (n === 0) return "bg-red-100 text-red-800";
  if (n <= 5) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function DisponibilidadPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reserveTarget, setReserveTarget] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ name: "", email: "" });

  const { data: destinations } = useDestinations();
  const { data: categories } = useInventoryCategories();

  const filters = startDate && endDate
    ? {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        destinationId: destinationId || undefined,
        categoryId: categoryId || undefined,
      }
    : null;

  const { data: result, isLoading } = useAvailability(filters);
  const createReservation = useCreateReservation();

  const sizeRows = result
    ? Object.entries(result.bySize).sort(([a], [b]) => a.localeCompare(b))
    : [];

  const reserveFirst = async (size: string) => {
    if (!result || !startDate || !endDate || !customer.name) return;
    const item = result.items.find((i) => i.size === size);
    if (!item) return;
    await createReservation.mutateAsync({
      itemId: item.id,
      customerName: customer.name,
      customerEmail: customer.email || null,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    });
    setReserveTarget(null);
    setCustomer({ name: "", email: "" });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Disponibilidad de Material
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Consulta material disponible por fechas, destino y categoría
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-warm-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <DateField label="Fecha inicio" value={startDate} onChange={setStartDate} />
        <DateField label="Fecha fin" value={endDate} onChange={setEndDate} />
        <SelectField
          label="Destino"
          value={destinationId}
          onChange={setDestinationId}
          options={[{ id: "", name: "Todos los destinos" }, ...(destinations ?? [])]}
        />
        <SelectField
          label="Categoría"
          value={categoryId}
          onChange={setCategoryId}
          options={[{ id: "", name: "Todas las categorías" }, ...(categories ?? [])]}
        />
      </div>

      {!filters && (
        <div className="rounded-2xl border border-dashed border-warm-border bg-white p-12 text-center text-sm text-text-secondary">
          Selecciona fecha de inicio y fin para consultar disponibilidad
        </div>
      )}

      {filters && isLoading && (
        <div className="rounded-2xl border border-warm-border bg-white p-12 text-center text-sm text-text-secondary">
          Calculando disponibilidad…
        </div>
      )}

      {filters && result && (
        <>
          <div className="rounded-2xl border border-warm-border bg-white p-4">
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">
                {result.availableCount}
              </span>{" "}
              de {result.total} unidades disponibles en este rango
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Talla</th>
                  <th className="px-3 py-2 text-left">Disponibles</th>
                  <th className="px-3 py-2 text-left">Total</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border">
                {sizeRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-12 text-center text-text-secondary">
                      Sin material para los filtros seleccionados
                    </td>
                  </tr>
                ) : sizeRows.map(([size, counts]) => (
                  <tr key={size} className="hover:bg-warm-muted/30">
                    <td className="px-3 py-2.5 font-medium text-text-primary">{size}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-semibold ${colorForCount(counts.available)}`}>
                        {counts.available}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">{counts.total}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        {reserveTarget === size ? (
                          <>
                            <input
                              placeholder="Cliente"
                              value={customer.name}
                              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                              className="w-32 rounded-[10px] border border-warm-border bg-white px-2 py-1 text-xs"
                            />
                            <input
                              placeholder="Email"
                              value={customer.email}
                              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                              className="w-40 rounded-[10px] border border-warm-border bg-white px-2 py-1 text-xs"
                            />
                            <button
                              onClick={() => reserveFirst(size)}
                              disabled={!customer.name || createReservation.isPending}
                              className="rounded-[8px] bg-coral px-2 py-1 text-xs font-medium text-white hover:bg-coral-hover disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setReserveTarget(null)}
                              className="rounded-[8px] px-2 py-1 text-xs text-text-secondary hover:bg-warm-muted"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setReserveTarget(size)}
                            disabled={counts.available === 0}
                            className="inline-flex items-center gap-1 rounded-[8px] border border-warm-border bg-white px-2 py-1 text-xs font-medium text-text-primary hover:bg-warm-muted disabled:opacity-40"
                          >
                            <CalendarCheck className="h-3.5 w-3.5" /> Reservar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-normal text-text-primary"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-normal text-text-primary"
      >
        {options.map((o) => (
          <option key={o.id || "_all"} value={o.id}>{o.name}</option>
        ))}
      </select>
    </label>
  );
}
