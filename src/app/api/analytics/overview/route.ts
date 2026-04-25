import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "analytics:overview" });

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;
  const days = Math.min(365, Math.max(1, parseInt(sp.get("days") ?? "30", 10)));

  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const [reservations, quotes, transactions, contacts] = await Promise.all([
      prisma.reservation.findMany({
        where: { tenantId, createdAt: { gte: since } },
        select: { id: true, totalPrice: true, status: true, createdAt: true, source: true },
      }),
      prisma.quote.findMany({
        where: { tenantId, createdAt: { gte: since } },
        select: { id: true, status: true, totalAmount: true, paymentStatus: true },
      }),
      prisma.transaction.findMany({
        where: { tenantId, date: { gte: since } },
        select: { type: true, amountCents: true },
      }),
      prisma.cachedContact.count({ where: { tenantId, dateAdded: { gte: since } } }),
    ]);

    const revenue = transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amountCents, 0);
    const expenses = transactions
      .filter((t) => t.type === "expense" || t.type === "supplier_settlement")
      .reduce((s, t) => s + t.amountCents, 0);

    const confirmedReservations = reservations.filter((r) => r.status === "confirmada").length;
    const paidQuotes = quotes.filter((q) => q.paymentStatus === "paid").length;
    const totalQuotesValue = quotes.reduce((s, q) => s + q.totalAmount, 0);

    const conversionRate = quotes.length > 0 ? (paidQuotes / quotes.length) * 100 : 0;
    const avgBookingValue = confirmedReservations > 0
      ? reservations.filter((r) => r.status === "confirmada").reduce((s, r) => s + r.totalPrice, 0) / confirmedReservations
      : 0;

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      kpis: {
        revenueCents: revenue,
        expensesCents: expenses,
        netCents: revenue - expenses,
        reservations: reservations.length,
        confirmedReservations,
        quotes: quotes.length,
        paidQuotes,
        newContacts: contacts,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgBookingValue: Math.round(avgBookingValue * 100) / 100,
        quotesValue: totalQuotesValue,
      },
    });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to compute overview");
    return NextResponse.json({ error: "Failed to compute overview" }, { status: 500 });
  }
}
