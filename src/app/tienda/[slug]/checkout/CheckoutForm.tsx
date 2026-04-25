"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  priceCents: number;
}

interface CartSnapshot {
  id: string;
  sessionToken: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  items: CartItem[];
  promoCode: string | null;
  discountCents: number;
  subtotalCents: number;
  totalCents: number;
}

const TOKEN_KEY = (slug: string) => `cart_token:${slug}`;

const PROVIDER_LABEL: Record<"redsys" | "stripe" | "manual", string> = {
  redsys: "Tarjeta (Redsys)",
  stripe: "Tarjeta (Stripe)",
  manual: "Transferencia / Pago manual",
};

function fmt(cents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function CheckoutForm({
  slug,
  enabledProviders,
}: {
  slug: string;
  enabledProviders: ("redsys" | "stripe" | "manual")[];
  stripePublicKey: string | null;
}) {
  const router = useRouter();

  const [cart, setCart] = useState<CartSnapshot | null>(null);
  const [provider, setProvider] = useState<"redsys" | "stripe" | "manual">(
    enabledProviders[0] ?? "manual"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = localStorage.getItem(TOKEN_KEY(slug));
        if (!token) {
          if (!cancelled) {
            setError("No hay carrito activo");
            setLoading(false);
          }
          return;
        }
        const res = await fetch(`/api/checkout/cart?token=${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error("Carrito no encontrado o expirado");
        const json = (await res.json()) as { cart: CartSnapshot };
        if (cancelled) return;
        setCart(json.cart);
        setName(json.cart.customerName ?? "");
        setEmail(json.cart.customerEmail ?? "");
        setPhone(json.cart.customerPhone ?? "");
        setPromoInput(json.cart.promoCode ?? "");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const providerOptions = useMemo(
    () => enabledProviders.map((v) => ({ value: v, label: PROVIDER_LABEL[v] })),
    [enabledProviders]
  );

  async function applyPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!cart || !promoInput.trim()) return;
    setPromoMsg(null);
    const res = await fetch("/api/checkout/cart/apply-promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: cart.sessionToken, promoCode: promoInput.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPromoMsg(json?.error || "Codigo no valido");
      return;
    }
    setCart(json.cart);
    setPromoMsg(`Descuento aplicado: ${fmt(json.cart.discountCents)}`);
  }

  async function pay() {
    if (!cart) return;
    setError(null);
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Completa nombre, email y telefono");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/checkout/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: cart.sessionToken,
          provider,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          paymentType: "full",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error al iniciar el pago");

      if (json.provider === "redsys" && json.redsys?.formUrl) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = json.redsys.formUrl;
        for (const [k, v] of Object.entries(json.redsys.fields ?? {})) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }

      if (json.provider === "stripe" && json.stripe?.clientSecret) {
        localStorage.removeItem(TOKEN_KEY(slug));
        router.push(
          `/tienda/${slug}/checkout/success?intentId=${json.paymentIntentId}&pending=1`
        );
        return;
      }

      if (json.provider === "manual") {
        localStorage.removeItem(TOKEN_KEY(slug));
        router.push(`/tienda/${slug}/checkout/success?intentId=${json.paymentIntentId}`);
        return;
      }

      throw new Error("Respuesta de pago no soportada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-[#8A8580]">
        Cargando carrito...
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-[16px] border border-[#E8E4DE] bg-white p-8 text-center">
          <h1 className="text-xl font-semibold">Carrito no disponible</h1>
          <p className="mt-2 text-sm text-[#8A8580]">{error ?? "Vuelve a la tienda y agrega productos."}</p>
          <Link
            href={`/tienda/${slug}`}
            className="mt-4 inline-flex rounded-[10px] px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--brand-primary, #E87B5A)" }}
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Finalizar compra</h1>

      <section className="mt-6 rounded-[16px] border border-[#E8E4DE] bg-white p-5">
        <h2 className="text-base font-semibold">Resumen</h2>
        <ul className="mt-3 divide-y divide-[#E8E4DE]">
          {cart.items.map((it, idx) => (
            <li key={`${it.productId}-${idx}`} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-medium">{it.name}</p>
                <p className="text-xs text-[#8A8580]">x{it.quantity}</p>
              </div>
              <span className="font-mono">{fmt(it.priceCents * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-[#E8E4DE] pt-3 text-sm">
          <div className="flex justify-between"><span className="text-[#8A8580]">Subtotal</span><span className="font-mono">{fmt(cart.subtotalCents)}</span></div>
          {cart.discountCents > 0 && (
            <div className="flex justify-between text-[#5B8C6D]"><span>Descuento{cart.promoCode ? ` (${cart.promoCode})` : ""}</span><span className="font-mono">-{fmt(cart.discountCents)}</span></div>
          )}
          <div className="flex justify-between text-base font-semibold"><span>Total</span><span className="font-mono">{fmt(cart.totalCents)}</span></div>
        </div>
      </section>

      <form onSubmit={applyPromo} className="mt-4 flex gap-2">
        <input
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value)}
          placeholder="Codigo promocional"
          className="flex-1 rounded-[10px] border border-[#E8E4DE] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--brand-primary,#E87B5A)]"
        />
        <button type="submit" className="rounded-[10px] border border-[#E8E4DE] bg-white px-4 py-2 text-sm font-medium hover:bg-[#F2EFEA]">
          Aplicar
        </button>
      </form>
      {promoMsg && <p className="mt-1 text-xs text-[#8A8580]">{promoMsg}</p>}

      <section className="mt-6 rounded-[16px] border border-[#E8E4DE] bg-white p-5">
        <h2 className="text-base font-semibold">Tus datos</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Nombre completo" value={name} onChange={setName} required />
          <Field label="Email" value={email} onChange={setEmail} type="email" required />
          <Field label="Telefono" value={phone} onChange={setPhone} required />
        </div>
      </section>

      {providerOptions.length > 0 ? (
        <section className="mt-6 rounded-[16px] border border-[#E8E4DE] bg-white p-5">
          <h2 className="text-base font-semibold">Metodo de pago</h2>
          <div className="mt-3 space-y-2">
            {providerOptions.map((p) => (
              <label key={p.value} className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-[#E8E4DE] px-3 py-2.5 text-sm hover:bg-[#FAF9F7]">
                <input
                  type="radio"
                  name="provider"
                  checked={provider === p.value}
                  onChange={() => setProvider(p.value)}
                  className="accent-[color:var(--brand-primary,#E87B5A)]"
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </section>
      ) : (
        <p className="mt-6 rounded-[10px] border border-[#E8E4DE] bg-white px-4 py-3 text-sm text-[#8A8580]">
          No hay metodos de pago configurados. Contacta con la tienda.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-[10px] border border-[#C75D4A]/30 bg-[#C75D4A]/10 px-3 py-2 text-sm text-[#C75D4A]">{error}</p>
      )}

      <button
        onClick={pay}
        disabled={paying || providerOptions.length === 0 || cart.totalCents <= 0}
        className="mt-6 w-full rounded-[10px] px-4 py-3 text-base font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: "var(--brand-primary, #E87B5A)" }}
      >
        {paying ? "Procesando..." : `Pagar ${fmt(cart.totalCents)}`}
      </button>
      <Link
        href={`/tienda/${slug}`}
        className="mt-3 block text-center text-xs text-[#8A8580] hover:underline"
      >
        Volver a la tienda
      </Link>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-[#6E6A65]">{label}{required && " *"}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-[10px] border border-[#E8E4DE] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--brand-primary,#E87B5A)]"
      />
    </label>
  );
}
