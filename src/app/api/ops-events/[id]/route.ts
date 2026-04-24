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

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(EVENT_TYPES).optional(),
  date: z.string().datetime().optional(),
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;

  const event = await prisma.opsEvent.findFirst({
    where: { id, tenantId },
    include: {
      destination: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ event });
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
  const log = logger.child({ tenantId, path: `/api/ops-events/${id}` });

  try {
    const existing = await prisma.opsEvent.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
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

    const data: Prisma.OpsEventUpdateInput = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.type !== undefined) data.type = d.type;
    if (d.date !== undefined) data.date = new Date(d.date);
    if (d.startTime !== undefined) data.startTime = d.startTime;
    if (d.endTime !== undefined) data.endTime = d.endTime;
    if (d.allDay !== undefined) data.allDay = d.allDay;
    if (d.destinationId !== undefined) {
      data.destination = d.destinationId
        ? { connect: { id: d.destinationId } }
        : { disconnect: true };
    }
    if (d.supplierId !== undefined) {
      data.supplier = d.supplierId
        ? { connect: { id: d.supplierId } }
        : { disconnect: true };
    }
    if (d.assignedTo !== undefined) data.assignedTo = d.assignedTo;
    if (d.status !== undefined) data.status = d.status;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.color !== undefined) data.color = d.color;
    if (d.reservationId !== undefined) data.reservationId = d.reservationId;
    if (d.metadata !== undefined && d.metadata !== null) {
      data.metadata = JSON.parse(JSON.stringify(d.metadata)) as Prisma.InputJsonValue;
    }

    const event = await prisma.opsEvent.update({
      where: { id },
      data,
      include: {
        destination: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    log.info({ eventId: id }, "Ops event updated");
    return NextResponse.json({ event });
  } catch (error) {
    log.error({ error }, "Failed to update ops event");
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/ops-events/${id}` });

  const existing = await prisma.opsEvent.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  await prisma.opsEvent.delete({ where: { id } });
  log.info({ eventId: id }, "Ops event deleted");
  return NextResponse.json({ success: true });
}
