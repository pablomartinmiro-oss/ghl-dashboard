import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions as PermissionKey[], "reservations:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;
  const station = searchParams.get("station");
  const date = searchParams.get("date");

  if (!station || !date) {
    return NextResponse.json({ error: "station and date required" }, { status: 400 });
  }

  try {
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const capacities = await prisma.stationCapacity.findMany({
      where: { tenantId, station, date: queryDate },
    });

    const result: Record<string, { booked: number; max: number; available: number }> = {};
    for (const cap of capacities) {
      result[cap.serviceType] = {
        booked: cap.booked,
        max: cap.maxCapacity,
        available: cap.maxCapacity - cap.booked,
      };
    }

    return NextResponse.json({ station, date, capacity: result });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch capacity", detail: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
