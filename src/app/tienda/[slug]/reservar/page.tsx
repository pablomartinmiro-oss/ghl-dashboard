"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Destination {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  category: string;
  price: number | null;
  destination: { id: string; name: string } | null;
}

interface BrandingView {
  primaryColor: string;
}

export default function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("productId");

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [branding, setBranding] = useState<BrandingView | null>(null);
  const [allowBookings, setAllowBookings] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [cfgRes, destRes, prodRes] = await Promise.all([
        fetch(`/api/storefront/${slug}`),
        fetch(`/api/storefront/${slug}/destinations`),
        fetch(`/api/storefront/${slug}/products`),
      ]);
      if (!cancelled && cfgRes.ok) {
        const json = await cfgRes.json();
        setBranding(json.branding);
        setAllowBookings(json.config.allowBookings);
      }
      if (!cancelled && destRes.ok) {
        const json = await destRes.json();
        setDestinations(json.destinations);
      }
      if (!cancelled && prodRes.ok) {
        const json = await prodRes.json();
        setProducts(json.products);
        if (preselectedProductId) {
          setSelectedProducts(new Set([preselectedProductId]));
          const p = json.products.find(
            (x: ProductOption) => x.id === preselectedProductId,
          );
          if (p?.destination?.id) setDestinationId(p.destination.id);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, preselectedProductId]);

  const primary = branding?.primaryColor || "#E87B5A";

  function toggleProduct(id: string) {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerEmail.trim() || !startDate) {
      setError("Completa los campos obligatorios");
      return;
    }
    if (!privacy) {
      setError("Debes aceptar la politica de privacidad");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/storefront/${slug}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim() || null,
          destinationId: destinationId || null,
          startDate,
          endDate: endDate || null,
          guests,
          productIds: Array.from(selectedProducts),
          notes: notes.trim() || null,
          promoCode: promoCode.trim() || null,
          website,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Error al enviar la solicitud");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!allowBookings) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Reservas no disponibles</h1>
        <p className="mt-2 text-sm text-[#8A8580]">
          En este momento no estamos aceptando solicitudes online. Contacta con nosotros directamente.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: "#5B8C6D" }}
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Solicitud recibida!</h1>
        <p className="mt-2 text-sm text-[#6E6A65]">
          Gracias por tu solicitud. Un agente se pondra en contacto contigo en menos de 24 horas.
        </p>
        <Link
          href={`/tienda/${slug}`}
          className="mt-6 inline-flex rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: primary }}
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Solicitar reserva</h1>
      <p className="mt-1 text-sm text-[#8A8580]">
        Completa el formulario y un agente se pondra en contacto contigo.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-6 rounded-[16px] border border-[#E8E4DE] bg-white p-6 sm:p-8"
      >
        {/* Honeypot */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
          aria-hidden="true"
        />

        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo *" htmlFor="name">
            <input
              id="name"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Email *" htmlFor="email">
            <input
              id="email"
              type="email"
              required
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Telefono" htmlFor="phone">
            <input
              id="phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Destino" htmlFor="destination">
            <select
              id="destination"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className={inputCls}
            >
              <option value="">Sin preferencia</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha inicio *" htmlFor="start">
            <input
              id="start"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Fecha fin" htmlFor="end">
            <input
              id="end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Numero de personas" htmlFor="guests">
            <input
              id="guests"
              type="number"
              min={1}
              max={99}
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
              className={inputCls}
            />
          </Field>
          <Field label="Codigo promocional" htmlFor="promo">
            <input
              id="promo"
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className={inputCls}
            />
          </Field>
        </section>

        <section>
          <label className="mb-2 block text-sm font-medium">Productos de interes</label>
          <div className="max-h-60 overflow-y-auto rounded-[10px] border border-[#E8E4DE] bg-[#FAF9F7] p-3">
            {products.length === 0 ? (
              <p className="text-sm text-[#8A8580]">No hay productos disponibles.</p>
            ) : (
              <div className="grid gap-1">
                {products.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-sm hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="h-4 w-4 rounded border-[#E8E4DE]"
                      style={{ accentColor: primary }}
                    />
                    <span className="flex-1">{p.name}</span>
                    <span className="text-xs capitalize text-[#8A8580]">
                      {p.category.replace(/_/g, " ")}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </section>

        <Field label="Notas adicionales" htmlFor="notes">
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls}
            placeholder="Cuentanos cualquier detalle importante: nivel, equipacion, accesibilidad..."
          />
        </Field>

        <label className="flex items-start gap-2 text-sm text-[#4A4744]">
          <input
            type="checkbox"
            required
            checked={privacy}
            onChange={(e) => setPrivacy(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#E8E4DE]"
            style={{ accentColor: primary }}
          />
          <span>
            Acepto la politica de privacidad y el tratamiento de mis datos para gestionar esta solicitud.
          </span>
        </label>

        {error && (
          <div
            className="rounded-[10px] border px-3 py-2 text-sm"
            style={{ borderColor: "#C75D4A", color: "#C75D4A", backgroundColor: "#C75D4A10" }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-[10px] px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60 sm:w-auto"
          style={{ backgroundColor: primary }}
        >
          {submitting ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-[10px] border border-[#E8E4DE] bg-white px-3 py-2 text-sm focus:border-[color:var(--brand-primary)] focus:outline-none";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#2D2A26]">
        {label}
      </label>
      {children}
    </div>
  );
}
