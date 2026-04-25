import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  const reservations = await prisma.reservation.findMany({
    where: { tenantId },
    select: { clientEmail: true, totalPrice: true, createdAt: true, status: true },
  });

  const byCustomer = new Map<string, { bookings: number; totalSpent: number; firstBooking: Date; lastBooking: Date }>();
  for (const r of reservations) {
    if (!r.clientEmail) continue;
    const cur = byCustomer.get(r.clientEmail) ?? {
      bookings: 0,
      totalSpent: 0,
      firstBooking: r.createdAt,
      lastBooking: r.createdAt,
    };
    cur.bookings++;
    if (r.status === "confirmada") cur.totalSpent += r.totalPrice;
    if (r.createdAt < cur.firstBooking) cur.firstBooking = r.createdAt;
    if (r.createdAt > cur.lastBooking) cur.lastBooking = r.createdAt;
    byCustomer.set(r.clientEmail, cur);
  }

  const customers = byCustomer.size;
  const repeatCustomers = Array.from(byCustomer.values()).filter((c) => c.bookings > 1).length;
  const totalRevenue = Array.from(byCustomer.values()).reduce((s, c) => s + c.totalSpent, 0);
  const clv = customers > 0 ? totalRevenue / customers : 0;
  const repeatRate = customers > 0 ? (repeatCustomers / customers) * 100 : 0;

  // Cohorts by month of first booking
  const cohorts = new Map<string, { newCustomers: number; revenue: number }>();
  for (const c of byCustomer.values()) {
    const month = c.firstBooking.toISOString().slice(0, 7);
    const cur = cohorts.get(month) ?? { newCustomers: 0, revenue: 0 };
    cur.newCustomers++;
    cur.revenue += c.totalSpent;
    cohorts.set(month, cur);
  }

  const top = Array.from(byCustomer.entries())
    .map(([email, c]) => ({ email, ...c }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  return NextResponse.json({
    customers,
    repeatCustomers,
    repeatRate: Math.round(repeatRate * 10) / 10,
    avgClv: Math.round(clv * 100) / 100,
    cohorts: Array.from(cohorts.entries())
      .map(([month, m]) => ({ month, ...m }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    topCustomers: top,
  });
}
