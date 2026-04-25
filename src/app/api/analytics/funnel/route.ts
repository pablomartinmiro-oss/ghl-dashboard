import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;
  const days = Math.min(365, Math.max(7, parseInt(sp.get("days") ?? "30", 10)));

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [contacts, bookingRequests, quotes, reservations] = await Promise.all([
    prisma.cachedContact.count({ where: { tenantId, dateAdded: { gte: since } } }),
    prisma.bookingRequest.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.quote.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.reservation.count({
      where: { tenantId, createdAt: { gte: since }, status: "confirmada" },
    }),
  ]);

  const top = Math.max(1, contacts, bookingRequests, quotes, reservations);

  const stages = [
    { key: "contacts", label: "Contactos", count: contacts, pct: (contacts / top) * 100 },
    { key: "requests", label: "Solicitudes", count: bookingRequests, pct: (bookingRequests / top) * 100 },
    { key: "quotes", label: "Presupuestos", count: quotes, pct: (quotes / top) * 100 },
    { key: "bookings", label: "Reservas", count: reservations, pct: (reservations / top) * 100 },
  ];

  return NextResponse.json({ stages, days });
}
