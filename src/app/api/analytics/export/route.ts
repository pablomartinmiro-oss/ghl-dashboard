import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;
  const dataset = sp.get("dataset") ?? "reservations";
  const days = Math.min(365, Math.max(1, parseInt(sp.get("days") ?? "90", 10)));

  const since = new Date();
  since.setDate(since.getDate() - days);

  let header: string[] = [];
  let rows: string[][] = [];

  if (dataset === "reservations") {
    const data = await prisma.reservation.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        clientName: true,
        clientEmail: true,
        station: true,
        activityDate: true,
        totalPrice: true,
        status: true,
        source: true,
      },
      orderBy: { createdAt: "desc" },
    });
    header = ["id", "createdAt", "clientName", "clientEmail", "station", "activityDate", "totalPrice", "status", "source"];
    rows = data.map((r) => [
      r.id,
      r.createdAt.toISOString(),
      r.clientName,
      r.clientEmail,
      r.station,
      r.activityDate.toISOString(),
      String(r.totalPrice),
      r.status,
      r.source,
    ]);
  } else if (dataset === "quotes") {
    const data = await prisma.quote.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        clientName: true,
        clientEmail: true,
        destination: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
      },
      orderBy: { createdAt: "desc" },
    });
    header = ["id", "createdAt", "clientName", "clientEmail", "destination", "totalAmount", "status", "paymentStatus"];
    rows = data.map((q) => [
      q.id,
      q.createdAt.toISOString(),
      q.clientName,
      q.clientEmail ?? "",
      q.destination,
      String(q.totalAmount),
      q.status,
      q.paymentStatus ?? "",
    ]);
  } else if (dataset === "transactions") {
    const data = await prisma.transaction.findMany({
      where: { tenantId, date: { gte: since } },
      select: { id: true, date: true, type: true, category: true, description: true, amountCents: true, status: true },
      orderBy: { date: "desc" },
    });
    header = ["id", "date", "type", "category", "description", "amountCents", "status"];
    rows = data.map((t) => [
      t.id,
      t.date.toISOString(),
      t.type,
      t.category,
      t.description,
      String(t.amountCents),
      t.status,
    ]);
  } else {
    return NextResponse.json({ error: "Unknown dataset" }, { status: 400 });
  }

  const csv = [header.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dataset}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
