import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions as PermissionKey[], "reservations:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reservations/stats" });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's counts by status
    const todayReservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        activityDate: { gte: today, lt: tomorrow },
      },
      select: { status: true, station: true, totalPrice: true, source: true },
    });

    const confirmed = todayReservations.filter((r) => r.status === "confirmada").length;
    const noAvailability = todayReservations.filter((r) => r.status === "sin_disponibilidad").length;
    const pending = todayReservations.filter((r) => r.status === "pendiente").length;
    const total = todayReservations.length;

    // Station capacity for today
    const capacities = await prisma.stationCapacity.findMany({
      where: { tenantId, date: today },
    });

    const stationCapacity: Record<string, { booked: number; max: number }> = {};
    for (const cap of capacities) {
      if (!stationCapacity[cap.station]) {
        stationCapacity[cap.station] = { booked: 0, max: 0 };
      }
      stationCapacity[cap.station].booked += cap.booked;
      stationCapacity[cap.station].max += cap.maxCapacity;
    }

    // Weekly summary
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekReservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        createdAt: { gte: weekStart, lt: weekEnd },
        status: { in: ["confirmada", "pendiente"] },
      },
      select: { source: true, totalPrice: true, station: true },
    });

    const weeklyBySource: Record<string, number> = {};
    let weeklyTotal = 0;
    const stationCounts: Record<string, number> = {};
    for (const r of weekReservations) {
      weeklyBySource[r.source] = (weeklyBySource[r.source] || 0) + r.totalPrice;
      weeklyTotal += r.totalPrice;
      stationCounts[r.station] = (stationCounts[r.station] || 0) + 1;
    }

    const topStation = Object.entries(stationCounts).sort((a, b) => b[1] - a[1])[0];

    // Daily volume for the current week (Mon-Sun)
    const dailyVolume: { day: string; count: number; revenue: number }[] = [];
    const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const allWeekReservations = await prisma.reservation.findMany({
      where: { tenantId, createdAt: { gte: weekStart, lt: weekEnd } },
      select: { createdAt: true, totalPrice: true },
    });
    for (let d = 0; d < 7; d++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(dayStart.getDate() + d);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayRes = allWeekReservations.filter((r) => r.createdAt >= dayStart && r.createdAt < dayEnd);
      dailyVolume.push({
        day: DAY_LABELS[d],
        count: dayRes.length,
        revenue: dayRes.reduce((s, r) => s + r.totalPrice, 0),
      });
    }

    // Recent reservations (last 5)
    const recentReservations = await prisma.reservation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, clientName: true, station: true, status: true, totalPrice: true, source: true, createdAt: true },
    });

    log.info("Stats fetched");
    return NextResponse.json({
      today: { confirmed, noAvailability, pending, total },
      stationCapacity,
      weekly: {
        totalReservations: weekReservations.length,
        totalRevenue: weeklyTotal,
        bySource: weeklyBySource,
        topStation: topStation ? { name: topStation[0], count: topStation[1] } : null,
      },
      dailyVolume,
      recentReservations,
    });
  } catch (error) {
    log.error({ error }, "Failed to fetch stats");
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
