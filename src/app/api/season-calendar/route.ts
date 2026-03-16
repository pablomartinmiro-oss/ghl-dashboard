import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/season-calendar" });

  try {
    const entries = await prisma.seasonCalendar.findMany({
      where: { tenantId },
      orderBy: [{ station: "asc" }, { startDate: "asc" }],
    });

    log.info({ count: entries.length }, "Season calendar fetched");
    return NextResponse.json({ entries });
  } catch (error) {
    log.error({ error }, "Failed to fetch season calendar");
    return NextResponse.json(
      { error: "Failed to fetch season calendar" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, permissions } = session.user;

  const log = logger.child({ tenantId, path: "/api/season-calendar" });

  try {
    const body = await request.json();
    const { station, season, startDate, endDate, label } = body;

    if (!station || !season || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const entry = await prisma.seasonCalendar.create({
      data: {
        tenantId,
        station,
        season,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        label: label || null,
      },
    });

    log.info({ entryId: entry.id }, "Season calendar entry created");
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create season calendar entry");
    return NextResponse.json(
      { error: "Failed to create season calendar entry" },
      { status: 500 }
    );
  }
}
