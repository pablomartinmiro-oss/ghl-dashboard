"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Mountain, Lock, Loader2 } from "lucide-react";

function tokenKey(id: string) {
  return `supplier-portal-token:${id}`;
}

export default function SupplierPortalLoginPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId } = use(params);
  const router = useRouter();
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem(tokenKey(supplierId));
    if (existing) {
      router.replace(`/portal/${supplierId}/dashboard`);
      return;
    }

    let cancelled = false;
    fetch(`/api/suppliers/portal/${supplierId}/info`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setSupplierName(data.supplier?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(pin)) {
      setError("El PIN debe tener 6 dígitos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/portal/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Error al iniciar sesión");
        return;
      }
      localStorage.setItem(tokenKey(supplierId), data.token);
      router.replace(`/portal/${supplierId}/dashboard`);
    } catch {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-coral" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-text-primary">Portal no disponible</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Este proveedor no tiene acceso al portal o el enlace no es válido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral-light">
            <Mountain className="h-6 w-6 text-coral" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-text-primary">
            {supplierName ?? "Portal de Proveedor"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Introduce tu PIN para acceder
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              PIN de 6 dígitos
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 pl-9 font-mono text-lg tracking-[0.4em] focus:border-coral focus:outline-none"
                placeholder="••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || pin.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-coral px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-coral-hover disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Acceder
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-secondary">
          ¿No tienes PIN? Contacta con Skicenter.
        </p>
      </div>
    </div>
  );
}
