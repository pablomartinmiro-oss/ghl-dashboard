import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-_]+$/).optional(),
  country: z.string().length(2).optional(),
  region: z.string().max(120).nullable().optional(),
  timezone: z.string().max(60).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;

  const destination = await prisma.destination.findFirst({
    where: { id, tenantId },
  });
  if (!destination) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }
  return NextResponse.json({ destination });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/destinations/${id}` });

  try {
    const existing = await prisma.destination.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Destination not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    const destination = await prisma.destination.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.region !== undefined && { region: data.region }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.metadata !== undefined && { metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null }),
      },
    });

    log.info({ destinationId: id }, "Destination updated");
    return NextResponse.json({ destination });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un destino con ese slug" }, { status: 409 });
    }
    log.error({ error }, "Failed to update destination");
    return NextResponse.json({ error: "Failed to update destination" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/destinations/${id}` });

  const existing = await prisma.destination.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }

  await prisma.destination.delete({ where: { id } });
  log.info({ destinationId: id }, "Destination deleted");
  return NextResponse.json({ success: true });
}
