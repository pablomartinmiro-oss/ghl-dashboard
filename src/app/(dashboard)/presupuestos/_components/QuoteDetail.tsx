"use client";

import { useState } from "react";
import {
  Save, Send, Eye, Sparkles, MapPin, Calendar, Users, Phone, Mail,
  Sun, Snowflake, CalendarCheck, Trash2, Download, RefreshCw,
  CreditCard, CheckCircle, XCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Quote, QuoteItem } from "@/hooks/useQuotes";
import {
  useUpdateQuote, useUpdateQuoteItems, useDeleteQuote,
  useSendQuote, useMarkPaid,
} from "@/hooks/useQuotes";
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
  onDeleted?: () => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const EDITABLE_STATUSES = ["nuevo", "en_proceso", "borrador"];

function getInitialState(quote: Quote, products: Product[]) {
  if (quote.items && quote.items.length > 0) {
    return {
      items: quote.items.map((item: QuoteItem) => ({
        id: item.id, productId: item.productId, name: item.name,
        description: item.description, quantity: item.quantity,
        unitPrice: item.unitPrice, discount: item.discount,
        totalPrice: item.totalPrice,
      })),
      upsells: [] as Upsell[],
    };
  }
  return autoGeneratePackage(
    {
      destination: quote.destination, checkIn: quote.checkIn,
      checkOut: quote.checkOut, adults: quote.adults,
      children: quote.children,
      wantsAccommodation: quote.wantsAccommodation,
      wantsForfait: quote.wantsForfait,
      wantsClases: quote.wantsClases,
      wantsEquipment: quote.wantsEquipment,
    },
    products,
  );
}

export function QuoteDetail({ quote, products, onPreviewEmail, onDeleted }: QuoteDetailProps) {
  const router = useRouter();
  const initial = getInitialState(quote, products);
  const [items, setItems] = useState<EditableItem[]>(initial.items);
  const [upsells, setUpsells] = useState<Upsell[]>(initial.upsells);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const updateQuote = useUpdateQuote();
  const updateItems = useUpdateQuoteItems();
  const createFromQuote = useCreateFromQuote();
  const deleteQuote = useDeleteQuote();
  const sendQuote = useSendQuote();
  const markPaid = useMarkPaid();
  const { data: calendarEntries } = useSeasonCalendar();

  const isEditable = EDITABLE_STATUSES.includes(quote.status);
  const season: Season = calendarEntries
    ? getSeasonFromCalendar(calendarEntries, quote.destination, new Date(quote.checkIn))
    : "media";
  const nights = Math.max(1, Math.ceil(
    (new Date(quote.checkOut).getTime() - new Date(quote.checkIn).getTime()) / 86400000,
  ));
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleAutoGenerate = () => {
    const result = autoGeneratePackage(
      {
        destination: quote.destination, checkIn: quote.checkIn,
        checkOut: quote.checkOut, adults: quote.adults,
        children: quote.children,
        wantsAccommodation: quote.wantsAccommodation,
        wantsForfait: quote.wantsForfait,
        wantsClases: quote.wantsClases,
        wantsEquipment: quote.wantsEquipment,
      },
      products, season,
    );
    setItems(result.items);
    setUpsells(result.upsells);
  };

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
    setItems((prev) => [...prev, {
      productId: upsell.product.id, name: upsell.product.name,
      description: upsell.product.description, quantity: totalPax,
      unitPrice: upsell.product.price, discount: 0,
      totalPrice: upsell.product.price * totalPax,
    }]);
    setUpsells((prev) => prev.filter((u) => u.product.id !== upsell.product.id));
  };

  const addProduct = (product: Product) => {
    setItems((prev) => [...prev, {
      productId: product.id, name: product.name,
      description: product.description, quantity: 1,
      unitPrice: product.price, discount: 0, totalPrice: product.price,
    }]);
    setShowAddProduct(false);
  };

  const serializeItems = () => items.map((item) => ({
    productId: item.productId, name: item.name, description: item.description,
    quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount,
    totalPrice: item.totalPrice,
  }));

  const handleSaveDraft = async () => {
    try {
      await updateItems.mutateAsync({ quoteId: quote.id, items: serializeItems() });
      if (quote.status === "nuevo") {
        await updateQuote.mutateAsync({ id: quote.id, status: "en_proceso" });
      }
      toast.success("Borrador guardado");
    } catch { toast.error("Error al guardar"); }
  };

  const handleSendQuote = async () => {
    try {
      await updateItems.mutateAsync({ quoteId: quote.id, items: serializeItems() });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);
      await updateQuote.mutateAsync({
        id: quote.id, totalAmount,
        expiresAt: expiresAt.toISOString(),
      });
      const result = await sendQuote.mutateAsync(quote.id);
      if (result.emailError) {
        toast.warning(`Presupuesto guardado como enviado, pero el email falló: ${result.emailError}`);
        if (result.redsysPaymentUrl) {
          await navigator.clipboard.writeText(result.redsysPaymentUrl).catch(() => null);
          toast.info("Enlace de pago copiado al portapapeles");
        }
      } else {
        toast.success("Presupuesto enviado con enlace de pago");
      }
    } catch { toast.error("Error al enviar"); }
  };

  const handleResend = async () => {
    try {
      const result = await sendQuote.mutateAsync(quote.id);
      if (result.emailError) {
        toast.warning(`Email falló: ${result.emailError}`);
        if (result.redsysPaymentUrl) {
          await navigator.clipboard.writeText(result.redsysPaymentUrl).catch(() => null);
          toast.info("Enlace de pago copiado al portapapeles");
        }
      } else {
        toast.success("Email reenviado");
      }
    } catch { toast.error("Error al reenviar"); }
  };

  const handleCreateReservation = async () => {
    try {
      await createFromQuote.mutateAsync(quote.id);
      toast.success("Reserva creada desde presupuesto");
      router.push("/reservas");
    } catch { toast.error("Error al crear reserva"); }
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este presupuesto? Esta acción no se puede deshacer.")) return;
    try {
      await deleteQuote.mutateAsync(quote.id);
      toast.success("Presupuesto eliminado");
      onDeleted?.();
    } catch { toast.error("Error al eliminar"); }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <ClientInfoSection quote={quote} season={season} nights={nights}
        isEditable={isEditable} onAutoGenerate={handleAutoGenerate} />

      {isEditable ? (
        <PackageTable
          items={items} upsells={upsells} products={products}
          showAddProduct={showAddProduct}
          onToggleAddProduct={() => setShowAddProduct(!showAddProduct)}
          onUpdateItem={updateItem}
          onRemoveItem={(i) => setItems((prev) => prev.filter((_, j) => j !== i))}
          onAddProduct={addProduct} onAddUpsell={addUpsell}
        />
      ) : (
        <ReadOnlyItems items={quote.items} totalAmount={quote.totalAmount} />
      )}

      {/* Actions bar */}
      <div className="border-t border-border bg-white px-6 py-4 flex items-center justify-between gap-3">
        {isEditable && (
          <EditableActions
            quote={quote} items={items} totalAmount={totalAmount}
            onSaveDraft={handleSaveDraft} onSend={handleSendQuote}
            onPreview={() => onPreviewEmail(quote, items)}
            onCreateReservation={handleCreateReservation}
            onDelete={handleDelete}
            isSaving={updateItems.isPending} isSending={sendQuote.isPending}
            isCreating={createFromQuote.isPending} isDeleting={deleteQuote.isPending}
          />
        )}
        {quote.status === "enviado" && (
          <EnviadoActions
            quote={quote} onResend={handleResend}
            onOpenPaymentModal={() => setShowPaymentModal(true)}
            onCreateReservation={handleCreateReservation}
            isSending={sendQuote.isPending}
            isCreating={createFromQuote.isPending}
          />
        )}
        {quote.status === "pagado" && <PagadoActions quote={quote} />}
        {quote.status === "expirado" && (
          <ExpiradoActions quote={quote} onResend={handleResend}
            isSending={sendQuote.isPending} />
        )}
        {quote.status === "cancelado" && <CanceladoActions />}
      </div>

      {showPaymentModal && (
        <PaymentModal
          quoteId={quote.id} markPaid={markPaid}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function ClientInfoSection({ quote, season, nights, isEditable, onAutoGenerate }: {
  quote: Quote; season: Season; nights: number;
  isEditable: boolean; onAutoGenerate: () => void;
}) {
  return (
    <>
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">{quote.clientName}</h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-secondary">
              {quote.clientPhone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {quote.clientPhone}</span>}
              {quote.clientEmail && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {quote.clientEmail}</span>}
            </div>
          </div>
          {isEditable && (
            <button onClick={onAutoGenerate} className="flex items-center gap-2 rounded-lg border border-coral bg-coral-light px-3 py-2 text-sm font-medium text-coral hover:bg-coral-light transition-colors">
              <Sparkles className="h-4 w-4" /> Auto-generar
            </button>
          )}
        </div>
        {quote.clientNotes && <p className="mt-3 text-sm text-text-secondary italic">&ldquo;{quote.clientNotes}&rdquo;</p>}
      </div>
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
    </>
  );
}

function ServiceBadge({ label }: { label: string }) {
  return <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-xs font-medium text-coral">{label}</span>;
}

function ReadOnlyItems({ items, totalAmount }: { items: QuoteItem[]; totalAmount: number }) {
  const fmt = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border text-left text-xs text-text-secondary">
          <th className="pb-2">Producto</th><th className="pb-2 text-right">Cant.</th>
          <th className="pb-2 text-right">Precio</th><th className="pb-2 text-right">Total</th>
        </tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/50">
              <td className="py-2">{item.name}</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{fmt(item.unitPrice)}</td>
              <td className="py-2 text-right font-medium">{fmt(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={3} className="pt-3 text-right font-semibold">Total</td>
          <td className="pt-3 text-right text-lg font-bold text-coral">{fmt(totalAmount)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

function EditableActions({ quote, items, totalAmount, onSaveDraft, onSend, onPreview, onCreateReservation, onDelete, isSaving, isSending, isCreating, isDeleting }: {
  quote: Quote; items: EditableItem[]; totalAmount: number;
  onSaveDraft: () => void; onSend: () => void; onPreview: () => void;
  onCreateReservation: () => void; onDelete: () => void;
  isSaving: boolean; isSending: boolean; isCreating: boolean; isDeleting: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <button onClick={onCreateReservation} disabled={isCreating} className="flex items-center gap-2 rounded-lg border border-sage bg-sage-light px-4 py-2.5 text-sm font-medium text-sage hover:bg-sage-light/80 transition-colors disabled:opacity-50">
          <CalendarCheck className="h-4 w-4" /> Crear Reserva
        </button>
        <button onClick={onDelete} disabled={isDeleting} className="flex items-center gap-2 rounded-lg border border-muted-red/30 px-3 py-2.5 text-sm font-medium text-muted-red hover:bg-muted-red-light transition-colors disabled:opacity-50">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onSaveDraft} disabled={isSaving} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface transition-colors disabled:opacity-50">
          <Save className="h-4 w-4" /> Guardar Borrador
        </button>
        <button onClick={onPreview} className="flex items-center gap-2 rounded-lg border border-coral px-4 py-2.5 text-sm font-medium text-coral hover:bg-coral-light transition-colors">
          <Eye className="h-4 w-4" /> Vista Previa
        </button>
        <button onClick={onSend} disabled={isSending || items.length === 0} className="flex items-center gap-2 rounded-lg bg-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-hover transition-colors disabled:opacity-50">
          <Send className="h-4 w-4" /> Enviar
        </button>
      </div>
    </>
  );
}

function EnviadoActions({ quote, onResend, onOpenPaymentModal, onCreateReservation, isSending, isCreating }: {
  quote: Quote; onResend: () => void;
  onOpenPaymentModal: () => void;
  onCreateReservation: () => void;
  isSending: boolean; isCreating: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-gold-light px-3 py-1 text-xs font-medium text-gold">
          <Clock className="h-3.5 w-3.5" /> Pendiente de pago
        </span>
        <button onClick={onCreateReservation} disabled={isCreating}
          className="flex items-center gap-2 rounded-lg border border-sage bg-sage-light px-3 py-1.5 text-xs font-medium text-sage hover:bg-sage-light/80 transition-colors disabled:opacity-50">
          <CalendarCheck className="h-3.5 w-3.5" /> {isCreating ? "Creando..." : "Crear Reserva"}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
          <Download className="h-4 w-4" /> Descargar PDF
        </a>
        <button onClick={onResend} disabled={isSending}
          className="flex items-center gap-2 rounded-lg border border-coral px-4 py-2.5 text-sm font-medium text-coral hover:bg-coral-light transition-colors disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> {isSending ? "Enviando..." : "Reenviar Email"}
        </button>
        <button onClick={onOpenPaymentModal}
          className="flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-medium text-white hover:bg-sage/90 transition-colors">
          <CreditCard className="h-4 w-4" /> Marcar como Pagado
        </button>
      </div>
    </>
  );
}

function PagadoActions({ quote }: { quote: Quote }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-sage px-3 py-1 text-xs font-medium text-white">
          <CheckCircle className="h-3.5 w-3.5" /> Pagado
        </span>
        {quote.sentAt && (
          <span className="text-xs text-text-secondary">
            {formatDate(quote.sentAt)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
          <Download className="h-4 w-4" /> Descargar PDF
        </a>
      </div>
    </>
  );
}

function ExpiradoActions({ quote, onResend, isSending }: {
  quote: Quote; onResend: () => void; isSending: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
          <XCircle className="h-3.5 w-3.5" /> Expirado
        </span>
      </div>
      <div className="flex items-center gap-3">
        <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
          <Download className="h-4 w-4" /> Descargar PDF
        </a>
        <button onClick={onResend} disabled={isSending}
          className="flex items-center gap-2 rounded-lg bg-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-hover transition-colors disabled:opacity-50">
          <Send className="h-4 w-4" /> Reenviar
        </button>
      </div>
    </>
  );
}

function CanceladoActions() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
        <XCircle className="h-3.5 w-3.5" /> Cancelado
      </span>
    </div>
  );
}

function PaymentModal({ quoteId, markPaid, onClose }: {
  quoteId: string;
  markPaid: ReturnType<typeof useMarkPaid>;
  onClose: () => void;
}) {
  const [method, setMethod] = useState("transfer");
  const [ref, setRef] = useState("");

  const handleSubmit = async () => {
    try {
      await markPaid.mutateAsync({
        id: quoteId,
        paymentMethod: method,
        paymentRef: ref || undefined,
      });
      toast.success("Marcado como pagado");
      onClose();
    } catch { toast.error("Error al marcar como pagado"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-text-primary">Marcar como Pagado</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-text-primary">Metodo de pago</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral">
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="redsys">Redsys (TPV)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Referencia (opcional)</label>
            <input type="text" value={ref} onChange={(e) => setRef(e.target.value)}
              placeholder="Ej: TRF-123456"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm placeholder:text-text-secondary focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={markPaid.isPending}
            className="rounded-lg bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage/90 transition-colors disabled:opacity-50">
            {markPaid.isPending ? "Guardando..." : "Confirmar Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
