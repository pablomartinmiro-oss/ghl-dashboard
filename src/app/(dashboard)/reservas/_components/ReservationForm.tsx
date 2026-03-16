"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Snowflake, Sun } from "lucide-react";
import { toast } from "sonner";
import { useCreateReservation, useCapacity, type Reservation, type Participant } from "@/hooks/useReservations";
import { useProducts } from "@/hooks/useProducts";
import { useSeasonCalendar } from "@/hooks/useSeasonCalendar";
import { getSeasonFromCalendar } from "@/hooks/usePricing";
import { getProductPrice } from "@/lib/pricing/client";
import type { Season } from "@/lib/pricing/types";
import { STATIONS, SCHEDULES, LANGUAGES, formatEUR } from "./constants";
import { VoucherSection } from "./VoucherSection";
import { PriceBreakdown } from "./PriceBreakdown";
import { ParticipantsTable } from "./ParticipantsTable";
import { ClientSearch } from "./ClientSearch";
import { findProductForService, findEquipmentProduct, getServiceDays } from "./pricing-helpers";
import type { PriceLineItem } from "./pricing-helpers";
import type { VoucherData } from "@/hooks/useVoucher";

type FormMode = "individual" | "grupal";
type Source = "groupon" | "caja" | "presupuesto";
type NotifyMethod = "email" | "whatsapp" | "ambos";

interface FormData {
  clientName: string; clientPhone: string; clientEmail: string; couponCode: string;
  station: string; activityDate: string; schedule: string; language: string;
  totalPrice: string; discount: string; paymentMethod: string; paymentRef: string;
  notes: string; internalNotes: string;
  voucherSecurityCode: string; voucherCouponCode: string; voucherProduct: string;
  voucherPricePaid: string; voucherExpiry: string; voucherRedeemed: boolean;
}

const EMPTY_FORM: FormData = {
  clientName: "", clientPhone: "", clientEmail: "", couponCode: "",
  station: "", activityDate: "", schedule: "", language: "es",
  totalPrice: "", discount: "0", paymentMethod: "", paymentRef: "",
  notes: "", internalNotes: "",
  voucherSecurityCode: "", voucherCouponCode: "", voucherProduct: "",
  voucherPricePaid: "", voucherExpiry: "", voucherRedeemed: false,
};

const EMPTY_PARTICIPANT: Participant = { name: "", type: "adulto", service: "Cursillo 3d", level: "Principiante", material: true };

interface ReservationFormProps {
  existingReservations: Reservation[] | undefined;
  lastReservation: Reservation | null;
  onCreated: () => void;
}

export function ReservationForm({ existingReservations, lastReservation, onCreated }: ReservationFormProps) {
  const [mode, setMode] = useState<FormMode>("individual");
  const [source, setSource] = useState<Source>("caja");
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [participants, setParticipants] = useState<Participant[]>([{ ...EMPTY_PARTICIPANT }]);
  const [notifyMethod, setNotifyMethod] = useState<NotifyMethod>("ambos");
  const [manualPriceOverride, setManualPriceOverride] = useState(false);
  const createReservation = useCreateReservation();
  const nameRef = useRef<HTMLInputElement>(null);
  const sessionStation = useRef("");
  const sessionDate = useRef("");

  // Pricing data
  const { data: products } = useProducts(undefined, form.station || undefined);
  const { data: calendarEntries } = useSeasonCalendar();
  const { data: capacityData } = useCapacity(form.station || null, form.activityDate || null);

  const detectedSeason: Season = useMemo(() => {
    if (!form.activityDate || !form.station || !calendarEntries) return "media";
    return getSeasonFromCalendar(calendarEntries, form.station, new Date(form.activityDate));
  }, [form.activityDate, form.station, calendarEntries]);

  // Auto-calculate price breakdown
  const priceBreakdown: PriceLineItem[] = useMemo(() => {
    if (!products || !form.station || !form.activityDate) return [];
    const lines: PriceLineItem[] = [];
    for (const p of participants) {
      const days = getServiceDays(p.service);
      const serviceProduct = findProductForService(products, p.service, p.type, form.station);
      if (serviceProduct?.pricingMatrix) {
        const price = getProductPrice(serviceProduct.pricingMatrix, serviceProduct.category, detectedSeason, days, 1, 1);
        if (price > 0) lines.push({ label: `${serviceProduct.name} — ${p.name || p.type}`, unitPrice: price, quantity: 1, days, subtotal: price });
      }
      if (p.material) {
        const equipProduct = findEquipmentProduct(products, p.type, form.station);
        if (equipProduct?.pricingMatrix) {
          const price = getProductPrice(equipProduct.pricingMatrix, equipProduct.category, detectedSeason, days);
          if (price > 0) lines.push({ label: `${equipProduct.name} — ${p.name || p.type}`, unitPrice: price, quantity: 1, days, subtotal: price });
        }
      }
    }
    return lines;
  }, [products, form.station, form.activityDate, participants, detectedSeason]);

  const autoTotal = useMemo(() => priceBreakdown.reduce((sum, l) => sum + l.subtotal, 0), [priceBreakdown]);

  // Derived effective price — no setState needed
  const effectivePrice = useMemo(() => {
    if (manualPriceOverride || source === "groupon") return form.totalPrice;
    if (autoTotal > 0) return String(autoTotal);
    return form.totalPrice;
  }, [manualPriceOverride, source, autoTotal, form.totalPrice]);

  const updateField = useCallback((field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleVoucherRead = useCallback((data: VoucherData) => {
    setForm((prev) => ({
      ...prev,
      voucherSecurityCode: data.codigoSeguridad ?? "", voucherCouponCode: data.codigoCupon ?? "",
      voucherProduct: data.producto ?? "", voucherPricePaid: data.cantidadPagada ? String(data.cantidadPagada) : "",
      voucherExpiry: data.caduca ?? "", couponCode: data.codigoCupon ?? prev.couponCode,
      totalPrice: data.cantidadPagada ? String(data.cantidadPagada) : prev.totalPrice, paymentMethod: "groupon",
    }));
  }, []);

  useEffect(() => {
    if (form.station) sessionStation.current = form.station;
    if (form.activityDate) sessionDate.current = form.activityDate;
  }, [form.station, form.activityDate]);

  const duplicateWarning = useMemo(() => {
    if (!form.clientName || !form.activityDate || !form.station || !existingReservations) return false;
    return existingReservations.some(
      (r) => r.clientName.toLowerCase() === form.clientName.toLowerCase() && r.activityDate.startsWith(form.activityDate) && r.station === form.station
    );
  }, [form.clientName, form.activityDate, form.station, existingReservations]);

  const clearForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, station: sessionStation.current, activityDate: sessionDate.current });
    setParticipants([{ ...EMPTY_PARTICIPANT }]);
    setManualPriceOverride(false);
    nameRef.current?.focus();
  }, []);

  const duplicateLast = useCallback(() => {
    if (!lastReservation) { toast.error("No hay reserva anterior para duplicar"); return; }
    setForm({
      clientName: lastReservation.clientName, clientPhone: lastReservation.clientPhone, clientEmail: lastReservation.clientEmail,
      couponCode: lastReservation.couponCode ?? "", station: lastReservation.station,
      activityDate: lastReservation.activityDate.split("T")[0], schedule: lastReservation.schedule, language: lastReservation.language,
      totalPrice: String(lastReservation.totalPrice), discount: String(lastReservation.discount),
      paymentMethod: lastReservation.paymentMethod ?? "", paymentRef: lastReservation.paymentRef ?? "",
      notes: lastReservation.notes ?? "", internalNotes: lastReservation.internalNotes ?? "",
      voucherSecurityCode: "", voucherCouponCode: "", voucherProduct: "", voucherPricePaid: "", voucherExpiry: "", voucherRedeemed: false,
    });
    if (lastReservation.participants) setParticipants(lastReservation.participants);
    setSource(lastReservation.source as Source);
    toast.info("Reserva duplicada — revisa los datos");
  }, [lastReservation]);

  const handleSubmit = useCallback(
    (status: "confirmada" | "sin_disponibilidad") => {
      if (!form.clientName || !form.clientPhone || !form.clientEmail) { toast.error("Completa los datos del cliente"); return; }
      if (!form.station || !form.activityDate || !form.schedule) { toast.error("Completa los datos de la reserva"); return; }
      if (source === "groupon" && !form.voucherRedeemed && status === "confirmada") { toast.error("Marca el cupón como canjeado en Groupon antes de confirmar"); return; }
      createReservation.mutate(
        {
          clientName: form.clientName, clientPhone: form.clientPhone, clientEmail: form.clientEmail,
          couponCode: source === "groupon" ? (form.voucherCouponCode || form.couponCode) : undefined, source,
          ...(source === "groupon" ? {
            voucherSecurityCode: form.voucherSecurityCode || undefined, voucherCouponCode: form.voucherCouponCode || undefined,
            voucherProduct: form.voucherProduct || undefined, voucherPricePaid: form.voucherPricePaid ? parseFloat(form.voucherPricePaid) : undefined,
            voucherExpiry: form.voucherExpiry || undefined, voucherRedeemed: form.voucherRedeemed,
            voucherRedeemedAt: form.voucherRedeemed ? new Date().toISOString() : undefined,
          } : {}),
          station: form.station, activityDate: form.activityDate, schedule: form.schedule, language: form.language,
          participants: mode === "grupal" ? participants : undefined, services: mode === "individual" ? [] : undefined,
          totalPrice: parseFloat(effectivePrice) || 0, discount: parseFloat(form.discount) || 0,
          paymentMethod: form.paymentMethod || undefined, paymentRef: form.paymentRef || undefined,
          status, notes: form.notes || undefined, internalNotes: form.internalNotes || undefined,
          notificationType: status === "confirmada" ? "confirmacion" : "sin_disponibilidad",
        },
        {
          onSuccess: () => {
            toast.success(status === "confirmada"
              ? `Reserva confirmada para ${form.clientName}`
              : `Sin disponibilidad — ${form.clientName}`);
            onCreated(); clearForm();
          },
          onError: () => toast.error("Error al crear la reserva"),
        }
      );
    },
    [form, source, mode, participants, createReservation, onCreated, clearForm, effectivePrice]
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "F1") { e.preventDefault(); clearForm(); }
      else if (e.key === "F2") { e.preventDefault(); handleSubmit("confirmada"); }
      else if (e.key === "F3") { e.preventDefault(); handleSubmit("sin_disponibilidad"); }
      else if (e.key === "F4") { e.preventDefault(); duplicateLast(); }
      else if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); handleSubmit("confirmada"); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [clearForm, handleSubmit, duplicateLast]);

  const capacitySummary = capacityData?.capacity
    ? Object.entries(capacityData.capacity).map(([type, cap]) => ({ type, ...cap }))
    : [];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Mode toggle + shortcuts */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <button onClick={() => setMode("individual")} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${mode === "individual" ? "bg-coral text-white" : "bg-warm-muted text-text-secondary hover:bg-warm-border"}`}>Reserva Individual</button>
        <button onClick={() => setMode("grupal")} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${mode === "grupal" ? "bg-coral text-white" : "bg-warm-muted text-text-secondary hover:bg-warm-border"}`}>Reserva Grupal</button>
        <div className="ml-auto flex gap-1">
          <button onClick={clearForm} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-200" title="F1">Nueva (F1)</button>
          <button onClick={duplicateLast} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-200" title="F4">Duplicar (F4)</button>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {/* Source selection */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Origen</label>
          <div className="grid grid-cols-3 gap-2">
            {([{ value: "groupon", label: "CUPÓN GROUPON" }, { value: "caja", label: "VENTA EN CAJA" }, { value: "presupuesto", label: "DESDE PRESUPUESTO" }] as const).map((s) => (
              <button key={s.value} onClick={() => setSource(s.value)} className={`rounded-lg border-2 p-3 text-center text-sm font-semibold transition-colors ${source === s.value ? "border-coral bg-coral-light text-coral" : "border-warm-border bg-white text-text-secondary hover:border-coral/50"}`}>
                <div className="text-xs">{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        {source === "groupon" && (
          <VoucherSection onVoucherRead={handleVoucherRead} securityCode={form.voucherSecurityCode} couponCode={form.voucherCouponCode}
            product={form.voucherProduct} pricePaid={form.voucherPricePaid} expiry={form.voucherExpiry} redeemed={form.voucherRedeemed}
            onFieldChange={(field, value) => updateField(field as keyof FormData, value)} />
        )}

        {/* Cliente */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Cliente</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <ClientSearch
                value={form.clientName}
                onChange={(v) => updateField("clientName", v)}
                onSelect={(c) => { updateField("clientName", c.name); updateField("clientPhone", c.phone); updateField("clientEmail", c.email); }}
                reservations={existingReservations}
                inputRef={nameRef}
              />
              {duplicateWarning && <div className="mt-1 flex items-center gap-1 text-xs text-yellow-600"><AlertTriangle className="h-3 w-3" /> Ya existe una reserva para este cliente en esta fecha.</div>}
            </div>
            <div><label className="mb-1 block text-xs text-text-secondary">Teléfono *</label><input type="tel" value={form.clientPhone} onChange={(e) => updateField("clientPhone", e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral" /></div>
            <div><label className="mb-1 block text-xs text-text-secondary">Email *</label><input type="email" value={form.clientEmail} onChange={(e) => updateField("clientEmail", e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral" /></div>
            {source === "groupon" && <div><label className="mb-1 block text-xs text-text-secondary">Código cupón</label><input type="text" value={form.couponCode} onChange={(e) => updateField("couponCode", e.target.value)} placeholder="GRP-XXXX" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral" /></div>}
          </div>
        </fieldset>

        {/* Reserva */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Reserva</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs text-text-secondary">Estación *</label><select value={form.station} onChange={(e) => updateField("station", e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"><option value="">Seleccionar estación</option>{STATIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Fecha de actividad *</label>
              <input type="date" lang="es" value={form.activityDate} onChange={(e) => updateField("activityDate", e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
              {form.activityDate && form.station && (
                <div className="mt-1">
                  {detectedSeason === "alta"
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-coral-light px-2 py-0.5 text-[10px] font-semibold text-coral"><Snowflake className="h-3 w-3" /> Temporada Alta</span>
                    : <span className="inline-flex items-center gap-1 rounded-full bg-sage-light px-2 py-0.5 text-[10px] font-semibold text-sage"><Sun className="h-3 w-3" /> Temporada Media</span>}
                </div>
              )}
            </div>
            <div><label className="mb-1 block text-xs text-text-secondary">Horario *</label><select value={form.schedule} onChange={(e) => updateField("schedule", e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"><option value="">Seleccionar horario</option>{SCHEDULES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            <div><label className="mb-1 block text-xs text-text-secondary">Idioma</label><select value={form.language} onChange={(e) => updateField("language", e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral">{LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
          </div>
          {capacitySummary.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {capacitySummary.map((c) => <span key={c.type} className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.available < 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{c.type.replace(/_/g, " ")}: {c.available}/{c.max} disponibles</span>)}
            </div>
          )}
        </fieldset>

        {mode === "grupal" && <ParticipantsTable participants={participants} onChange={setParticipants} />}

        {/* Precio */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Precio</legend>
          {source !== "groupon" && <PriceBreakdown lines={priceBreakdown} total={autoTotal} season={detectedSeason} />}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Precio total (€)</label>
              <input type="number" step="0.01" value={effectivePrice} onChange={(e) => { updateField("totalPrice", e.target.value); setManualPriceOverride(true); }}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral ${!manualPriceOverride && autoTotal > 0 && source !== "groupon" ? "border-sage bg-sage-light/30" : "border-border"}`} />
              {!manualPriceOverride && autoTotal > 0 && source !== "groupon" && <span className="mt-0.5 block text-[10px] text-sage">Auto-calculado</span>}
              {manualPriceOverride && autoTotal > 0 && source !== "groupon" && (
                <button type="button" onClick={() => { setManualPriceOverride(false); updateField("totalPrice", String(autoTotal)); }} className="mt-0.5 block text-[10px] text-coral hover:underline">
                  Restaurar precio automático ({formatEUR(autoTotal)})
                </button>
              )}
            </div>
            <div><label className="mb-1 block text-xs text-text-secondary">Descuento %</label><input type="number" min="0" max="100" value={form.discount} onChange={(e) => updateField("discount", e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral" /></div>
            <div><label className="mb-1 block text-xs text-text-secondary">Método de pago</label><select value={form.paymentMethod} onChange={(e) => updateField("paymentMethod", e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"><option value="">Seleccionar</option><option value="groupon">Groupon</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></div>
            <div><label className="mb-1 block text-xs text-text-secondary">Ref. pago</label><input type="text" value={form.paymentRef} onChange={(e) => updateField("paymentRef", e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral" /></div>
          </div>
          {effectivePrice && form.discount && Number(form.discount) > 0 && <div className="text-sm text-text-secondary">Precio final: {formatEUR(Number(effectivePrice) * (1 - Number(form.discount) / 100))}</div>}
        </fieldset>

        {/* Notas */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Notas</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs text-text-secondary">Notas para el cliente</label><textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral" /></div>
            <div><label className="mb-1 block text-xs text-text-secondary">Notas internas (no se envían)</label><textarea value={form.internalNotes} onChange={(e) => updateField("internalNotes", e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral" /></div>
          </div>
        </fieldset>
      </div>

      {/* Confirm bar */}
      <div className="border-t border-border bg-white p-4">
        <div className="mb-3 flex items-center gap-4">
          <span className="text-xs font-medium text-text-secondary">Notificar por:</span>
          {(["email", "whatsapp", "ambos"] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm"><input type="radio" name="notify" value={m} checked={notifyMethod === m} onChange={() => setNotifyMethod(m)} className="accent-coral" />{m === "email" ? "Email" : m === "whatsapp" ? "WhatsApp" : "Ambos"}</label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" className="gap-2 bg-sage text-white hover:bg-sage/90" onClick={() => handleSubmit("confirmada")} disabled={createReservation.isPending}><CheckCircle className="h-5 w-5" /> CONFIRMAR (F2)</Button>
          <Button size="lg" variant="destructive" className="gap-2" onClick={() => handleSubmit("sin_disponibilidad")} disabled={createReservation.isPending}><XCircle className="h-5 w-5" /> SIN DISP. (F3)</Button>
        </div>
        <div className="mt-2 text-center text-[10px] text-text-secondary">F1 = Nueva | F2 = Confirmar | F3 = Sin disp. | F4 = Duplicar | Ctrl+Enter = Confirmar</div>
      </div>
    </div>
  );
}
