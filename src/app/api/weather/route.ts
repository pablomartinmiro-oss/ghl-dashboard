import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  const destinationId = sp.get("destinationId");
  const days = Math.min(14, Math.max(1, parseInt(sp.get("days") ?? "7", 10)));

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const cache = await prisma.weatherCache.findMany({
    where: {
      tenantId,
      ...(destinationId ? { destinationId } : {}),
      date: { gte: start, lt: end },
    },
    orderBy: [{ destinationId: "asc" }, { date: "asc" }],
  });

  return NextResponse.json({ forecast: cache });
}
