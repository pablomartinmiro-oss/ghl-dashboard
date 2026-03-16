"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCreateReservation, useCapacity, type Reservation, type Participant } from "@/hooks/useReservations";
import { STATIONS, SCHEDULES, LANGUAGES, formatEUR } from "./constants";
import { VoucherSection } from "./VoucherSection";
import type { VoucherData } from "@/hooks/useVoucher";

type FormMode = "individual" | "grupal";
type Source = "groupon" | "caja" | "presupuesto";
type NotifyMethod = "email" | "whatsapp" | "ambos";

interface FormData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  couponCode: string;
  station: string;
  activityDate: string;
  schedule: string;
  language: string;
  totalPrice: string;
  discount: string;
  paymentMethod: string;
  paymentRef: string;
  notes: string;
  internalNotes: string;
  // Voucher fields
  voucherSecurityCode: string;
  voucherCouponCode: string;
  voucherProduct: string;
  voucherPricePaid: string;
  voucherExpiry: string;
  voucherRedeemed: boolean;
}

const EMPTY_FORM: FormData = {
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  couponCode: "",
  station: "",
  activityDate: "",
  schedule: "",
  language: "es",
  totalPrice: "",
  discount: "0",
  paymentMethod: "",
  paymentRef: "",
  notes: "",
  internalNotes: "",
  voucherSecurityCode: "",
  voucherCouponCode: "",
  voucherProduct: "",
  voucherPricePaid: "",
  voucherExpiry: "",
  voucherRedeemed: false,
};

const EMPTY_PARTICIPANT: Participant = {
  name: "",
  type: "adulto",
  service: "Cursillo 3d",
  level: "Principiante",
  material: true,
};

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
  // duplicateWarning is derived state, not useState

  const createReservation = useCreateReservation();
  const nameRef = useRef<HTMLInputElement>(null);

  // Smart defaults: remember last station and date per session
  const sessionStation = useRef("");
  const sessionDate = useRef("");

  // Capacity check
  const { data: capacityData } = useCapacity(
    form.station || null,
    form.activityDate || null
  );

  const updateField = useCallback((field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleVoucherRead = useCallback((data: VoucherData) => {
    setForm((prev) => ({
      ...prev,
      voucherSecurityCode: data.codigoSeguridad ?? "",
      voucherCouponCode: data.codigoCupon ?? "",
      voucherProduct: data.producto ?? "",
      voucherPricePaid: data.cantidadPagada ? String(data.cantidadPagada) : "",
      voucherExpiry: data.caduca ?? "",
      couponCode: data.codigoCupon ?? prev.couponCode,
      totalPrice: data.cantidadPagada ? String(data.cantidadPagada) : prev.totalPrice,
      paymentMethod: "groupon",
    }));
  }, []);

  // Smart defaults
  useEffect(() => {
    if (form.station) sessionStation.current = form.station;
    if (form.activityDate) sessionDate.current = form.activityDate;
  }, [form.station, form.activityDate]);

  // Duplicate detection (derived state)
  const duplicateWarning = useMemo(() => {
    if (!form.clientName || !form.activityDate || !form.station || !existingReservations) {
      return false;
    }
    return existingReservations.some(
      (r) =>
        r.clientName.toLowerCase() === form.clientName.toLowerCase() &&
        r.activityDate.startsWith(form.activityDate) &&
        r.station === form.station
    );
  }, [form.clientName, form.activityDate, form.station, existingReservations]);

  const clearForm = useCallback(() => {
    setForm({
      ...EMPTY_FORM,
      station: sessionStation.current,
      activityDate: sessionDate.current,
    });
    setParticipants([{ ...EMPTY_PARTICIPANT }]);
    nameRef.current?.focus();
  }, []);

  const duplicateLast = useCallback(() => {
    if (!lastReservation) {
      toast.error("No hay reserva anterior para duplicar");
      return;
    }
    setForm({
      clientName: lastReservation.clientName,
      clientPhone: lastReservation.clientPhone,
      clientEmail: lastReservation.clientEmail,
      couponCode: lastReservation.couponCode ?? "",
      station: lastReservation.station,
      activityDate: lastReservation.activityDate.split("T")[0],
      schedule: lastReservation.schedule,
      language: lastReservation.language,
      totalPrice: String(lastReservation.totalPrice),
      discount: String(lastReservation.discount),
      paymentMethod: lastReservation.paymentMethod ?? "",
      paymentRef: lastReservation.paymentRef ?? "",
      notes: lastReservation.notes ?? "",
      internalNotes: lastReservation.internalNotes ?? "",
      voucherSecurityCode: "",
      voucherCouponCode: "",
      voucherProduct: "",
      voucherPricePaid: "",
      voucherExpiry: "",
      voucherRedeemed: false,
    });
    if (lastReservation.participants) {
      setParticipants(lastReservation.participants);
    }
    setSource(lastReservation.source as Source);
    toast.info("Reserva duplicada — revisa los datos");
  }, [lastReservation]);

  const handleSubmit = useCallback(
    (status: "confirmada" | "sin_disponibilidad") => {
      if (!form.clientName || !form.clientPhone || !form.clientEmail) {
        toast.error("Completa los datos del cliente");
        return;
      }
      if (!form.station || !form.activityDate || !form.schedule) {
        toast.error("Completa los datos de la reserva");
        return;
      }
      if (source === "groupon" && !form.voucherRedeemed && status === "confirmada") {
        toast.error("Marca el cupón como canjeado en Groupon antes de confirmar");
        return;
      }

      const notificationType = status === "confirmada" ? "confirmacion" : "sin_disponibilidad";

      createReservation.mutate(
        {
          clientName: form.clientName,
          clientPhone: form.clientPhone,
          clientEmail: form.clientEmail,
          couponCode: source === "groupon" ? (form.voucherCouponCode || form.couponCode) : undefined,
          source,
          ...(source === "groupon"
            ? {
                voucherSecurityCode: form.voucherSecurityCode || undefined,
                voucherCouponCode: form.voucherCouponCode || undefined,
                voucherProduct: form.voucherProduct || undefined,
                voucherPricePaid: form.voucherPricePaid ? parseFloat(form.voucherPricePaid) : undefined,
                voucherExpiry: form.voucherExpiry || undefined,
                voucherRedeemed: form.voucherRedeemed,
                voucherRedeemedAt: form.voucherRedeemed ? new Date().toISOString() : undefined,
              }
            : {}),
          station: form.station,
          activityDate: form.activityDate,
          schedule: form.schedule,
          language: form.language,
          participants: mode === "grupal" ? participants : undefined,
          services: mode === "individual" ? [] : undefined,
          totalPrice: parseFloat(form.totalPrice) || 0,
          discount: parseFloat(form.discount) || 0,
          paymentMethod: form.paymentMethod || undefined,
          paymentRef: form.paymentRef || undefined,
          status,
          notes: form.notes || undefined,
          internalNotes: form.internalNotes || undefined,
          notificationType,
        },
        {
          onSuccess: () => {
            if (status === "confirmada") {
              toast.success(`Reserva confirmada — ${notifyMethod === "email" ? "email" : notifyMethod === "whatsapp" ? "WhatsApp" : "email + WhatsApp"} enviados a ${form.clientName}`);
            } else {
              toast.error(`Sin disponibilidad — notificación enviada a ${form.clientName}`);
            }
            onCreated();
            clearForm();
          },
          onError: () => {
            toast.error("Error al crear la reserva");
          },
        }
      );
    },
    [form, source, mode, participants, notifyMethod, createReservation, onCreated, clearForm]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        clearForm();
      } else if (e.key === "F2") {
        e.preventDefault();
        handleSubmit("confirmada");
      } else if (e.key === "F3") {
        e.preventDefault();
        handleSubmit("sin_disponibilidad");
      } else if (e.key === "F4") {
        e.preventDefault();
        duplicateLast();
      } else if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleSubmit("confirmada");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [clearForm, handleSubmit, duplicateLast]);

  // Capacity summary
  const capacitySummary = capacityData?.capacity
    ? Object.entries(capacityData.capacity).map(([type, cap]) => ({
        type,
        ...cap,
      }))
    : [];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <button
          onClick={() => setMode("individual")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "individual" ? "bg-cyan text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"
          }`}
        >
          Reserva Individual
        </button>
        <button
          onClick={() => setMode("grupal")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "grupal" ? "bg-cyan text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"
          }`}
        >
          Reserva Grupal
        </button>
        <div className="ml-auto flex gap-1">
          <button onClick={clearForm} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-200" title="F1">
            🆕 Nueva (F1)
          </button>
          <button onClick={duplicateLast} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-200" title="F4">
            📋 Duplicar (F4)
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {/* Source selection */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Origen</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "groupon", icon: "🏷️", label: "CUPÓN GROUPON" },
              { value: "caja", icon: "💰", label: "VENTA EN CAJA" },
              { value: "presupuesto", icon: "🔗", label: "DESDE PRESUPUESTO" },
            ] as const).map((s) => (
              <button
                key={s.value}
                onClick={() => setSource(s.value)}
                className={`rounded-lg border-2 p-3 text-center text-sm font-semibold transition-colors ${
                  source === s.value
                    ? "border-cyan bg-cyan-light text-cyan"
                    : "border-border bg-white text-text-secondary hover:border-cyan/50"
                }`}
              >
                <span className="text-lg">{s.icon}</span>
                <div className="mt-1 text-xs">{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Voucher Section — only for Groupon source */}
        {source === "groupon" && (
          <VoucherSection
            onVoucherRead={handleVoucherRead}
            securityCode={form.voucherSecurityCode}
            couponCode={form.voucherCouponCode}
            product={form.voucherProduct}
            pricePaid={form.voucherPricePaid}
            expiry={form.voucherExpiry}
            redeemed={form.voucherRedeemed}
            onFieldChange={(field, value) => updateField(field as keyof FormData, value)}
          />
        )}

        {/* Section 1: Cliente */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Cliente</legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Nombre completo *</label>
              <input
                ref={nameRef}
                type="text"
                value={form.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              />
              {duplicateWarning && (
                <div className="mt-1 flex items-center gap-1 text-xs text-yellow-600">
                  <AlertTriangle className="h-3 w-3" />
                  Ya existe una reserva para este cliente en esta fecha. ¿Continuar?
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Teléfono *</label>
              <input
                type="tel"
                value={form.clientPhone}
                onChange={(e) => updateField("clientPhone", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Email *</label>
              <input
                type="email"
                value={form.clientEmail}
                onChange={(e) => updateField("clientEmail", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              />
            </div>
            {source === "groupon" && (
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Código cupón Groupon</label>
                <input
                  type="text"
                  value={form.couponCode}
                  onChange={(e) => updateField("couponCode", e.target.value)}
                  placeholder="GRP-XXXX"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
                />
              </div>
            )}
          </div>
        </fieldset>

        {/* Section 2: Reserva */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Reserva</legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Estación *</label>
              <select
                value={form.station}
                onChange={(e) => updateField("station", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              >
                <option value="">Seleccionar estación</option>
                {STATIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Fecha de actividad *</label>
              <input
                type="date"
                lang="es"
                value={form.activityDate}
                onChange={(e) => updateField("activityDate", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Horario *</label>
              <select
                value={form.schedule}
                onChange={(e) => updateField("schedule", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              >
                <option value="">Seleccionar horario</option>
                {SCHEDULES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Idioma</label>
              <select
                value={form.language}
                onChange={(e) => updateField("language", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Capacity indicator */}
          {capacitySummary.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {capacitySummary.map((c) => (
                <span
                  key={c.type}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.available < 5
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {c.type.replace(/_/g, " ")}: {c.available}/{c.max} disponibles
                </span>
              ))}
            </div>
          )}
        </fieldset>

        {/* Section 3: Participants (Group Mode) */}
        {mode === "grupal" && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-text-primary">Participantes</legend>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Nombre</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Servicio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Nivel</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Material</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const next = [...participants];
                            next[i] = { ...next[i], name: e.target.value };
                            setParticipants(next);
                          }}
                          className="w-full rounded border border-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={p.type}
                          onChange={(e) => {
                            const next = [...participants];
                            next[i] = { ...next[i], type: e.target.value as "adulto" | "infantil" };
                            setParticipants(next);
                          }}
                          className="rounded border border-border bg-white px-2 py-1 text-sm"
                        >
                          <option value="adulto">Adulto</option>
                          <option value="infantil">Infantil</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={p.service}
                          onChange={(e) => {
                            const next = [...participants];
                            next[i] = { ...next[i], service: e.target.value };
                            setParticipants(next);
                          }}
                          className="rounded border border-border bg-white px-2 py-1 text-sm"
                        >
                          <option>Cursillo 3d</option>
                          <option>Cursillo 5d</option>
                          <option>Clase particular</option>
                          <option>Escuelita</option>
                          <option>Forfait</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={p.level}
                          onChange={(e) => {
                            const next = [...participants];
                            next[i] = { ...next[i], level: e.target.value };
                            setParticipants(next);
                          }}
                          className="rounded border border-border bg-white px-2 py-1 text-sm"
                        >
                          <option>Principiante</option>
                          <option>Intermedio</option>
                          <option>Avanzado</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={p.material}
                          onChange={(e) => {
                            const next = [...participants];
                            next[i] = { ...next[i], material: e.target.checked };
                            setParticipants(next);
                          }}
                          className="h-4 w-4 rounded border-border accent-cyan"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {participants.length > 1 && (
                          <button
                            onClick={() => setParticipants(participants.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setParticipants([...participants, { ...EMPTY_PARTICIPANT }])}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir participante
            </Button>
          </fieldset>
        )}

        {/* Section 4: Precio */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Precio</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Precio total (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.totalPrice}
                onChange={(e) => updateField("totalPrice", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Descuento %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={(e) => updateField("discount", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Método de pago</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => updateField("paymentMethod", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              >
                <option value="">Seleccionar</option>
                <option value="groupon">Groupon</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Ref. pago</label>
              <input
                type="text"
                value={form.paymentRef}
                onChange={(e) => updateField("paymentRef", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              />
            </div>
          </div>
          {form.totalPrice && form.discount && Number(form.discount) > 0 && (
            <div className="text-sm text-text-secondary">
              Precio final: {formatEUR(Number(form.totalPrice) * (1 - Number(form.discount) / 100))}
            </div>
          )}
        </fieldset>

        {/* Section 5: Notas */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text-primary">Notas</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Notas para el cliente</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Notas internas (no se envían)</label>
              <textarea
                value={form.internalNotes}
                onChange={(e) => updateField("internalNotes", e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
              />
            </div>
          </div>
        </fieldset>
      </div>

      {/* Section 6: Confirm bar — sticky bottom */}
      <div className="border-t border-border bg-white p-4">
        {/* Notification method */}
        <div className="mb-3 flex items-center gap-4">
          <span className="text-xs font-medium text-text-secondary">Notificar por:</span>
          {(["email", "whatsapp", "ambos"] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="notify"
                value={m}
                checked={notifyMethod === m}
                onChange={() => setNotifyMethod(m)}
                className="accent-cyan"
              />
              {m === "email" ? "Email" : m === "whatsapp" ? "WhatsApp" : "Ambos"}
            </label>
          ))}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="gap-2 bg-green-600 text-white hover:bg-green-700"
            onClick={() => handleSubmit("confirmada")}
            disabled={createReservation.isPending}
          >
            <CheckCircle className="h-5 w-5" />
            CONFIRMAR DISPONIBILIDAD
            <span className="ml-1 text-xs opacity-70">(F2)</span>
          </Button>
          <Button
            size="lg"
            variant="destructive"
            className="gap-2"
            onClick={() => handleSubmit("sin_disponibilidad")}
            disabled={createReservation.isPending}
          >
            <XCircle className="h-5 w-5" />
            SIN DISPONIBILIDAD
            <span className="ml-1 text-xs opacity-70">(F3)</span>
          </Button>
        </div>

        {/* Keyboard hint */}
        <div className="mt-2 text-center text-[10px] text-text-secondary">
          F1 = Nueva | F2 = Confirmar | F3 = Sin disp. | F4 = Duplicar | Ctrl+Enter = Confirmar
        </div>
      </div>
    </div>
  );
}
