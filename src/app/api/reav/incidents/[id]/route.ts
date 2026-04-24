import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const SEVERITIES = ["minor", "moderate", "serious", "critical"] as const;
const STATUSES = ["open", "investigating", "resolved", "closed"] as const;

const updateSchema = z.object({
  date: z.string().datetime().optional(),
  location: z.string().min(1).max(200).optional(),
  destinationId: z.string().nullable().optional(),
  severity: z.enum(SEVERITIES).optional(),
  description: z.string().min(1).max(4000).optional(),
  personsInvolved: z.string().max(1000).nullable().optional(),
  actionsTaken: z.string().max(2000).nullable().optional(),
  followUp: z.string().max(2000).nullable().optional(),
  reportedBy: z.string().min(1).max(120).optional(),
  status: z.enum(STATUSES).optional(),
  resolution: z.string().max(2000).nullable().optional(),
  closedAt: z.string().datetime().nullable().optional(),
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

  const incident = await prisma.incidentReport.findFirst({
    where: { id, tenantId },
    include: { destination: { select: { id: true, name: true } } },
  });
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }
  return NextResponse.json({ incident });
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
  const log = logger.child({ tenantId, path: `/api/reav/incidents/${id}` });

  try {
    const existing = await prisma.incidentReport.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
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

    const data: Prisma.IncidentReportUpdateInput = {};
    if (d.date !== undefined) data.date = new Date(d.date);
    if (d.location !== undefined) data.location = d.location;
    if (d.destinationId !== undefined) {
      data.destination = d.destinationId
        ? { connect: { id: d.destinationId } }
        : { disconnect: true };
    }
    if (d.severity !== undefined) data.severity = d.severity;
    if (d.description !== undefined) data.description = d.description;
    if (d.personsInvolved !== undefined) data.personsInvolved = d.personsInvolved;
    if (d.actionsTaken !== undefined) data.actionsTaken = d.actionsTaken;
    if (d.followUp !== undefined) data.followUp = d.followUp;
    if (d.reportedBy !== undefined) data.reportedBy = d.reportedBy;
    if (d.status !== undefined) {
      data.status = d.status;
      if ((d.status === "closed" || d.status === "resolved") && !existing.closedAt) {
        data.closedAt = new Date();
      }
    }
    if (d.resolution !== undefined) data.resolution = d.resolution;
    if (d.closedAt !== undefined) data.closedAt = d.closedAt ? new Date(d.closedAt) : null;

    const incident = await prisma.incidentReport.update({
      where: { id },
      data,
      include: { destination: { select: { id: true, name: true } } },
    });

    log.info({ incidentId: id }, "Incident report updated");
    return NextResponse.json({ incident });
  } catch (error) {
    log.error({ error }, "Failed to update incident report");
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 });
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
  const log = logger.child({ tenantId, path: `/api/reav/incidents/${id}` });

  const existing = await prisma.incidentReport.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }
  await prisma.incidentReport.delete({ where: { id } });
  log.info({ incidentId: id }, "Incident report deleted");
  return NextResponse.json({ success: true });
}
