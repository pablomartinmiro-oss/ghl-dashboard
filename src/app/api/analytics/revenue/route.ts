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
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days);

  const transactions = await prisma.transaction.findMany({
    where: { tenantId, date: { gte: since }, type: "income" },
    select: { amountCents: true, date: true, category: true },
  });

  const byDay = new Map<string, number>();
  const byCategory = new Map<string, number>();

  for (let i = 0; i <= days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }

  for (const t of transactions) {
    const day = t.date.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + t.amountCents);
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amountCents);
  }

  const series = Array.from(byDay.entries()).map(([date, cents]) => ({ date, cents }));
  const categories = Array.from(byCategory.entries())
    .map(([category, cents]) => ({ category, cents }))
    .sort((a, b) => b.cents - a.cents);
  const total = transactions.reduce((s, t) => s + t.amountCents, 0);

  return NextResponse.json({ series, categories, totalCents: total });
}
