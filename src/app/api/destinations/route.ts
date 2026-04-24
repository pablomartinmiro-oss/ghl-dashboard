import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-_]+$/, "Slug must be lowercase letters, numbers, hyphens or underscores"),
  country: z.string().length(2).optional(),
  region: z.string().max(120).nullable().optional(),
  timezone: z.string().max(60).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/destinations" });

  try {
    const destinations = await prisma.destination.findMany({
      where: { tenantId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ destinations });
  } catch (error) {
    log.error({ error }, "Failed to fetch destinations");
    return NextResponse.json({ error: "Failed to fetch destinations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/destinations" });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    const destination = await prisma.destination.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        country: data.country ?? "ES",
        region: data.region ?? null,
        timezone: data.timezone ?? "Europe/Madrid",
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isActive: data.isActive ?? true,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
      },
    });

    log.info({ destinationId: destination.id }, "Destination created");
    return NextResponse.json({ destination }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un destino con ese slug" }, { status: 409 });
    }
    log.error({ error }, "Failed to create destination");
    return NextResponse.json({ error: "Failed to create destination" }, { status: 500 });
  }
}
