"use client";

import { use, useEffect, useState } from "react";
import { PortalNav } from "../_components/PortalNav";
import { usePortalAuth } from "../_components/usePortalAuth";
import { CalendarCheck, Euro, Wallet, Loader2 } from "lucide-react";

interface DashboardData {
  supplier: { id: string; name: string };
  stats: {
    reservationsCount: number;
    revenueCents: number;
    pendingSettlementsCount: number;
    pendingSettlementsCents: number;
  };
}

interface Booking {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  totalPrice: number;
  startDate: string | null;
  endDate: string | null;
  numDays: number | null;
  numPersons: number | null;
  station: string | null;
  quote: {
    id: string;
    clientName: string;
    paidAt: string | null;
    destination: string;
  };
}

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function formatCents(cents: number) {
  return eur.format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SupplierPortalDashboardPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId } = use(params);
  const { ready, authedFetch } = usePortalAuth(supplierId);
  const [data, setData] = useState<DashboardData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function load() {
      try {
        const [dashRes, bookingsRes] = await Promise.all([
          authedFetch(`/api/suppliers/portal/${supplierId}/dashboard`),
          authedFetch(`/api/suppliers/portal/${supplierId}/bookings`),
        ]);
        if (!dashRes.ok) throw new Error("Error al cargar el panel");
        if (!bookingsRes.ok) throw new Error("Error al cargar reservas");
        const dash = await dashRes.json();
        const bk = await bookingsRes.json();
        if (cancelled) return;
        setData(dash);
        setBookings(bk.bookings ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ready, supplierId, authedFetch]);

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PortalNav supplierId={supplierId} supplierName={data?.supplier.name ?? null} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-coral" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-danger">{error}</div>
        ) : data ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                Resumen
              </h1>
              <p className="text-sm text-text-secondary">Últimos 30 días</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                icon={CalendarCheck}
                label="Reservas"
                value={data.stats.reservationsCount.toString()}
                helper="pagadas · 30 días"
              />
              <StatCard
                icon={Euro}
                label="Ingresos"
                value={formatCents(data.stats.revenueCents)}
                helper="facturado · 30 días"
              />
              <StatCard
                icon={Wallet}
                label="Pendiente"
                value={formatCents(data.stats.pendingSettlementsCents)}
                helper={`${data.stats.pendingSettlementsCount} liquidaciones`}
              />
            </div>

            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-text-primary">
                Reservas recientes
              </h2>
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {bookings.length === 0 ? (
                  <div className="p-8 text-center text-sm text-text-secondary">
                    No hay reservas en los últimos 30 días.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-surface/50">
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                            Cliente
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                            Producto
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                            Fecha
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-secondary">
                            Pax
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-secondary">
                            Importe
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-surface/30">
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium text-text-primary">
                                {b.quote.clientName}
                              </div>
                              <div className="text-xs text-text-secondary">
                                {formatDate(b.quote.paidAt)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-text-primary">
                              <div>{b.name}</div>
                              {b.station && (
                                <div className="text-xs text-text-secondary capitalize">
                                  {b.station.replace(/_/g, " ")}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-secondary">
                              {formatDate(b.startDate)}
                              {b.numDays ? ` · ${b.numDays}d` : ""}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-text-secondary">
                              {b.numPersons ?? b.quantity}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-sm text-text-primary">
                              {eur.format(b.totalPrice || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 text-text-secondary">
        <Icon className="h-4 w-4 text-coral" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-text-primary">{value}</div>
      <div className="mt-1 text-xs text-text-secondary">{helper}</div>
    </div>
  );
}
