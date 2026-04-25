import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fetchForecast } from "@/lib/weather/openweather";
import { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "weather:fetch" });

const schema = z.object({
  destinationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { destinationId } = parsed.data;

    const destinations = await prisma.destination.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(destinationId ? { id: destinationId } : {}),
      },
    });

    let totalDays = 0;
    for (const dest of destinations) {
      const lat = dest.latitude;
      const lon = dest.longitude;
      if (lat == null || lon == null) {
        log.warn({ destinationId: dest.id }, "Destination missing coordinates");
        continue;
      }

      const days = await fetchForecast(lat, lon);
      for (const day of days) {
        await prisma.weatherCache.upsert({
          where: {
            tenantId_destinationId_date: { tenantId, destinationId: dest.id, date: day.date },
          },
          create: {
            tenantId,
            destinationId: dest.id,
            date: day.date,
            tempMin: day.tempMin,
            tempMax: day.tempMax,
            snowfall: day.snowfall,
            windSpeed: day.windSpeed,
            conditions: day.conditions,
            snowDepth: null,
            avalancheRisk: null,
            raw: JSON.parse(JSON.stringify(day.raw)) as Prisma.InputJsonValue,
            fetchedAt: new Date(),
          },
          update: {
            tempMin: day.tempMin,
            tempMax: day.tempMax,
            snowfall: day.snowfall,
            windSpeed: day.windSpeed,
            conditions: day.conditions,
            raw: JSON.parse(JSON.stringify(day.raw)) as Prisma.InputJsonValue,
            fetchedAt: new Date(),
          },
        });
        totalDays++;
      }
    }

    return NextResponse.json({
      success: true,
      destinations: destinations.length,
      daysFetched: totalDays,
    });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to fetch weather");
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}
