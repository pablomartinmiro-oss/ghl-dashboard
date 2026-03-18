"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import { toast } from "sonner";
import { useCreateQuote } from "@/hooks/useQuotes";
import { ContactSearchPicker } from "@/components/shared/ContactSearchPicker";
import { STATIONS } from "../../reservas/_components/constants";

interface QuoteFormProps {
  onClose: () => void;
  onCreated: () => void;
}

export function QuoteForm({ onClose, onCreated }: QuoteFormProps) {
  const createQuote = useCreateQuote();
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientNotes: "",
    ghlContactId: "" as string | null,
    destination: "baqueira",
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    wantsAccommodation: false,
    wantsForfait: true,
    wantsClases: true,
    wantsEquipment: true,
  });

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleContactSelect = (contact: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  }) => {
    setForm((prev) => ({
      ...prev,
      ghlContactId: contact.id,
      clientName: contact.name || `${contact.firstName} ${contact.lastName}`.trim(),
      clientEmail: contact.email ?? "",
      clientPhone: contact.phone ?? "",
    }));
  };

  const handleContactClear = () => {
    setForm((prev) => ({
      ...prev,
      ghlContactId: null,
      clientName: "",
      clientEmail: "",
      clientPhone: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.checkIn || !form.checkOut) {
      toast.error("Nombre, check-in y check-out son obligatorios");
      return;
    }
    try {
      await createQuote.mutateAsync(form);
      toast.success("Presupuesto creado");
      onCreated();
    } catch {
      toast.error("Error al crear presupuesto");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-bold text-text-primary">Nuevo Presupuesto</h2>
        <button onClick={onClose} className="rounded-lg p-1.5 text-text-secondary hover:bg-warm-muted">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 space-y-5 p-6">
        {/* Client info */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Datos del cliente</legend>

          {/* GHL contact search */}
          <ContactSearchPicker
            onSelect={handleContactSelect}
            onClear={handleContactClear}
            selectedName={form.ghlContactId ? form.clientName : undefined}
          />

          {/* Manual fields — pre-filled on contact select, editable as fallback */}
          <input
            type="text"
            placeholder="Nombre completo *"
            value={form.clientName}
            onChange={(e) => set("clientName", e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="Email"
              value={form.clientEmail}
              onChange={(e) => set("clientEmail", e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={form.clientPhone}
              onChange={(e) => set("clientPhone", e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <textarea
            placeholder="Notas del cliente (opcional)"
            value={form.clientNotes}
            onChange={(e) => set("clientNotes", e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </fieldset>

        {/* Trip details */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Datos del viaje</legend>
          <select
            value={form.destination}
            onChange={(e) => set("destination", e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          >
            {STATIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Check-in *</label>
              <input
                type="date"
                value={form.checkIn}
                onChange={(e) => set("checkIn", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Check-out *</label>
              <input
                type="date"
                value={form.checkOut}
                onChange={(e) => set("checkOut", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Adultos</label>
              <input
                type="number"
                min={1}
                value={form.adults}
                onChange={(e) => set("adults", Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Niños</label>
              <input
                type="number"
                min={0}
                value={form.children}
                onChange={(e) => set("children", Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
          </div>
        </fieldset>

        {/* Services */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-text-primary">Servicios solicitados</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "wantsForfait", label: "Forfait" },
              { key: "wantsClases", label: "Clases" },
              { key: "wantsEquipment", label: "Alquiler material" },
              { key: "wantsAccommodation", label: "Alojamiento" },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-warm-muted"
              >
                <input
                  type="checkbox"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => set(key, e.target.checked)}
                  className="accent-coral"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={createQuote.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-hover transition-colors disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Crear Presupuesto
        </button>
      </form>
    </div>
  );
}
