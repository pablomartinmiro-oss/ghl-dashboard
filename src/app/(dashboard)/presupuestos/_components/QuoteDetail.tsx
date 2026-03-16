"use client";

import { useState } from "react";
import { Save, Send, Eye, Sparkles, MapPin, Calendar, Users, Phone, Mail, Sun, Snowflake, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Quote, QuoteItem } from "@/hooks/useQuotes";
import { useUpdateQuote, useUpdateQuoteItems } from "@/hooks/useQuotes";
import type { Product } from "@/hooks/useProducts";
import { autoGeneratePackage } from "@/lib/quotes/auto-package";
import type { Upsell } from "@/lib/quotes/auto-package";
import { useCreateFromQuote } from "@/hooks/useReservations";
import { useSeasonCalendar } from "@/hooks/useSeasonCalendar";
import { getSeasonFromCalendar } from "@/hooks/usePricing";
import type { Season } from "@/lib/pricing/types";
import { PackageTable, type EditableItem } from "./PackageTable";
import { STATIONS } from "../../reservas/_components/constants";

function getStationLabel(value: string): string {
  return STATIONS.find((s) => s.value === value)?.label ?? value;
}

interface QuoteDetailProps {
  quote: Quote;
  products: Product[];
  onPreviewEmail: (quote: Quote, items: EditableItem[]) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function getInitialState(quote: Quote, products: Product[]) {
  if (quote.items && quote.items.length > 0) {
    return {
      items: quote.items.map((item: QuoteItem) => ({
        id: item.id, productId: item.productId, name: item.name, description: item.description,
        quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, totalPrice: item.totalPrice,
      })),
      upsells: [] as Upsell[],
    };
  }
  return autoGeneratePackage(
    { destination: quote.destination, checkIn: quote.checkIn, checkOut: quote.checkOut, adults: quote.adults, children: quote.children, wantsAccommodation: quote.wantsAccommodation, wantsForfait: quote.wantsForfait, wantsClases: quote.wantsClases, wantsEquipment: quote.wantsEquipment },
    products
  );
}

export function QuoteDetail({ quote, products, onPreviewEmail }: QuoteDetailProps) {
  const router = useRouter();
  const initial = getInitialState(quote, products);
  const [items, setItems] = useState<EditableItem[]>(initial.items);
  const [upsells, setUpsells] = useState<Upsell[]>(initial.upsells);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const updateQuote = useUpdateQuote();
  const updateItems = useUpdateQuoteItems();
  const createFromQuote = useCreateFromQuote();
  const { data: calendarEntries } = useSeasonCalendar();

  const season: Season = calendarEntries
    ? getSeasonFromCalendar(calendarEntries, quote.destination, new Date(quote.checkIn))
    : "media";

  const nights = Math.max(1, Math.ceil((new Date(quote.checkOut).getTime() - new Date(quote.checkIn).getTime()) / 86400000));

  const handleAutoGenerate = () => {
    const result = autoGeneratePackage(
      { destination: quote.destination, checkIn: quote.checkIn, checkOut: quote.checkOut, adults: quote.adults, children: quote.children, wantsAccommodation: quote.wantsAccommodation, wantsForfait: quote.wantsForfait, wantsClases: quote.wantsClases, wantsEquipment: quote.wantsEquipment },
      products, season
    );
    setItems(result.items);
    setUpsells(result.upsells);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const updateItem = (index: number, field: keyof EditableItem, value: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === "quantity") item.quantity = value;
      if (field === "unitPrice") item.unitPrice = value;
      if (field === "discount") item.discount = value;
      item.totalPrice = item.unitPrice * item.quantity * (1 - item.discount / 100);
      updated[index] = item;
      return updated;
    });
  };

  const addUpsell = (upsell: Upsell) => {
    const totalPax = quote.adults + quote.children;
    setItems((prev) => [...prev, { productId: upsell.product.id, name: upsell.product.name, description: upsell.product.description, quantity: totalPax, unitPrice: upsell.product.price, discount: 0, totalPrice: upsell.product.price * totalPax }]);
    setUpsells((prev) => prev.filter((u) => u.product.id !== upsell.product.id));
  };

  const addProduct = (product: Product) => {
    setItems((prev) => [...prev, { productId: product.id, name: product.name, description: product.description, quantity: 1, unitPrice: product.price, discount: 0, totalPrice: product.price }]);
    setShowAddProduct(false);
  };

  const serializeItems = () => items.map((item) => ({
    productId: item.productId, name: item.name, description: item.description,
    quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, totalPrice: item.totalPrice,
  }));

  const handleSaveDraft = async () => {
    try {
      await updateItems.mutateAsync({ quoteId: quote.id, items: serializeItems() });
      if (quote.status === "nuevo") await updateQuote.mutateAsync({ id: quote.id, status: "en_proceso" });
      toast.success("Borrador guardado");
    } catch { toast.error("Error al guardar"); }
  };

  const handleSendQuote = async () => {
    try {
      await updateItems.mutateAsync({ quoteId: quote.id, items: serializeItems() });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);
      await updateQuote.mutateAsync({ id: quote.id, status: "enviado", totalAmount, sentAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() });
      toast.success("Presupuesto enviado");
    } catch { toast.error("Error al enviar"); }
  };

  const handleCreateReservation = async () => {
    try {
      await createFromQuote.mutateAsync(quote.id);
      toast.success("Reserva creada desde presupuesto");
      router.push("/reservas");
    } catch { toast.error("Error al crear reserva"); }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Client info */}
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">{quote.clientName}</h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-secondary">
              {quote.clientPhone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {quote.clientPhone}</span>}
              {quote.clientEmail && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {quote.clientEmail}</span>}
            </div>
          </div>
          <button onClick={handleAutoGenerate} className="flex items-center gap-2 rounded-lg border border-coral bg-coral-light px-3 py-2 text-sm font-medium text-coral hover:bg-coral-light transition-colors">
            <Sparkles className="h-4 w-4" /> Auto-generar
          </button>
        </div>
        {quote.clientNotes && <p className="mt-3 text-sm text-text-secondary italic">&ldquo;{quote.clientNotes}&rdquo;</p>}
      </div>

      {/* Request summary */}
      <div className="border-b border-border bg-surface/50 px-6 py-4">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Resumen de solicitud</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-coral" /> <span>{getStationLabel(quote.destination)}</span></div>
          <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-coral" /> <span>{formatDate(quote.checkIn)} — {formatDate(quote.checkOut)} ({nights} noches)</span></div>
          <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-coral" /> <span>{quote.adults} adultos{quote.children > 0 ? `, ${quote.children} niños` : ""}</span></div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${season === "alta" ? "bg-coral-light text-coral" : "bg-sage-light text-sage"}`}>
            {season === "alta" ? <Snowflake className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            {season === "alta" ? "Temporada Alta" : "Temporada Media"}
          </span>
          {quote.wantsForfait && <ServiceBadge label="Forfait" />}
          {quote.wantsClases && <ServiceBadge label="Clases" />}
          {quote.wantsEquipment && <ServiceBadge label="Alquiler" />}
        </div>
      </div>

      {/* Package builder */}
      <PackageTable
        items={items} upsells={upsells} products={products}
        showAddProduct={showAddProduct}
        onToggleAddProduct={() => setShowAddProduct(!showAddProduct)}
        onUpdateItem={updateItem}
        onRemoveItem={(i) => setItems((prev) => prev.filter((_, j) => j !== i))}
        onAddProduct={addProduct}
        onAddUpsell={addUpsell}
      />

      {/* Actions bar */}
      <div className="border-t border-border bg-white px-6 py-4 flex items-center justify-between gap-3">
        <button onClick={handleCreateReservation} disabled={createFromQuote.isPending} className="flex items-center gap-2 rounded-lg border border-sage bg-sage-light px-4 py-2.5 text-sm font-medium text-sage hover:bg-sage-light/80 transition-colors disabled:opacity-50">
          <CalendarCheck className="h-4 w-4" /> Crear Reserva
        </button>
        <div className="flex items-center gap-3">
          <button onClick={handleSaveDraft} disabled={updateItems.isPending} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" /> Guardar Borrador
          </button>
          <button onClick={() => onPreviewEmail(quote, items)} className="flex items-center gap-2 rounded-lg border border-coral px-4 py-2.5 text-sm font-medium text-coral hover:bg-coral-light transition-colors">
            <Eye className="h-4 w-4" /> Vista Previa
          </button>
          <button onClick={handleSendQuote} disabled={updateQuote.isPending || items.length === 0} className="flex items-center gap-2 rounded-lg bg-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-hover transition-colors disabled:opacity-50">
            <Send className="h-4 w-4" /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceBadge({ label }: { label: string }) {
  return <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-xs font-medium text-coral">{label}</span>;
}
