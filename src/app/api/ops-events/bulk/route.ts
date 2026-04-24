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

const eventSchema = z.object({
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

const bulkSchema = z.object({
  events: z.array(eventSchema).min(1).max(200),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/ops-events/bulk" });

  try {
    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { events } = parsed.data;

    const destIds = Array.from(
      new Set(events.map((e) => e.destinationId).filter((v): v is string => !!v))
    );
    const supIds = Array.from(
      new Set(events.map((e) => e.supplierId).filter((v): v is string => !!v))
    );

    if (destIds.length > 0) {
      const found = await prisma.destination.findMany({
        where: { id: { in: destIds }, tenantId },
        select: { id: true },
      });
      if (found.length !== destIds.length) {
        return NextResponse.json({ error: "One or more destinations not found" }, { status: 400 });
      }
    }
    if (supIds.length > 0) {
      const found = await prisma.supplier.findMany({
        where: { id: { in: supIds }, tenantId },
        select: { id: true },
      });
      if (found.length !== supIds.length) {
        return NextResponse.json({ error: "One or more suppliers not found" }, { status: 400 });
      }
    }

    const data: Prisma.OpsEventCreateManyInput[] = events.map((e) => ({
      tenantId,
      title: e.title,
      type: e.type,
      date: new Date(e.date),
      startTime: e.startTime ?? null,
      endTime: e.endTime ?? null,
      allDay: e.allDay ?? false,
      destinationId: e.destinationId ?? null,
      supplierId: e.supplierId ?? null,
      assignedTo: e.assignedTo ?? null,
      status: e.status ?? "scheduled",
      notes: e.notes ?? null,
      color: e.color ?? null,
      reservationId: e.reservationId ?? null,
      metadata: e.metadata
        ? (JSON.parse(JSON.stringify(e.metadata)) as Prisma.InputJsonValue)
        : undefined,
      createdBy: session.user.id ?? null,
    }));

    const result = await prisma.opsEvent.createMany({ data });
    log.info({ count: result.count }, "Bulk ops events created");
    return NextResponse.json({ count: result.count }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed bulk create ops events");
    return NextResponse.json({ error: "Failed to bulk create events" }, { status: 500 });
  }
}
