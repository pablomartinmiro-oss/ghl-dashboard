import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const EVENT_TYPES = [
  "pickup",
  "dropoff",
  "transfer",
  "lesson",
  "activity",
  "staff",
  "maintenance",
  "other",
] as const;

const EVENT_STATUS = ["scheduled", "in_progress", "completed", "cancelled"] as const;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

const createSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(EVENT_TYPES),
  date: z.string().datetime(),
  startTime: z.string().regex(TIME_RE).nullable().optional(),
  endTime: z.string().regex(TIME_RE).nullable().optional(),
  allDay: z.boolean().optional(),
  destinationId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
  status: z.enum(EVENT_STATUS).optional(),
  notes: z.string().max(2000).nullable().optional(),
  color: z.string().regex(HEX_RE).nullable().optional(),
  reservationId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;
  const log = logger.child({ tenantId, path: "/api/ops-events" });

  try {
    const where: Prisma.OpsEventWhereInput = { tenantId };

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");
    const destinationId = searchParams.get("destinationId");
    const status = searchParams.get("status");

    if (from || to) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
      where.date = dateFilter;
    }
    if (type) where.type = type;
    if (destinationId) where.destinationId = destinationId;
    if (status) where.status = status;

    const events = await prisma.opsEvent.findMany({
      where,
      include: {
        destination: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 1000,
    });

    return NextResponse.json({ events });
  } catch (error) {
    log.error({ error }, "Failed to fetch ops events");
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/ops-events" });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    if (d.destinationId) {
      const dest = await prisma.destination.findFirst({
        where: { id: d.destinationId, tenantId },
      });
      if (!dest) {
        return NextResponse.json({ error: "Destination not found" }, { status: 400 });
      }
    }
    if (d.supplierId) {
      const sup = await prisma.supplier.findFirst({
        where: { id: d.supplierId, tenantId },
      });
      if (!sup) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 400 });
      }
    }

    const event = await prisma.opsEvent.create({
      data: {
        tenantId,
        title: d.title,
        type: d.type,
        date: new Date(d.date),
        startTime: d.startTime ?? null,
        endTime: d.endTime ?? null,
        allDay: d.allDay ?? false,
        destinationId: d.destinationId ?? null,
        supplierId: d.supplierId ?? null,
        assignedTo: d.assignedTo ?? null,
        status: d.status ?? "scheduled",
        notes: d.notes ?? null,
        color: d.color ?? null,
        reservationId: d.reservationId ?? null,
        metadata: d.metadata
          ? (JSON.parse(JSON.stringify(d.metadata)) as Prisma.InputJsonValue)
          : undefined,
        createdBy: session.user.id ?? null,
      },
      include: {
        destination: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    log.info({ eventId: event.id }, "Ops event created");
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create ops event");
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
