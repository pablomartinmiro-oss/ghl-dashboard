import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const SEVERITIES = ["minor", "moderate", "serious", "critical"] as const;
const STATUSES = ["open", "investigating", "resolved", "closed"] as const;

const createSchema = z.object({
  date: z.string().datetime(),
  location: z.string().min(1).max(200),
  destinationId: z.string().nullable().optional(),
  severity: z.enum(SEVERITIES),
  description: z.string().min(1).max(4000),
  personsInvolved: z.string().max(1000).nullable().optional(),
  actionsTaken: z.string().max(2000).nullable().optional(),
  followUp: z.string().max(2000).nullable().optional(),
  reportedBy: z.string().min(1).max(120),
  status: z.enum(STATUSES).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;

  const where: Prisma.IncidentReportWhereInput = { tenantId };
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const destinationId = searchParams.get("destinationId");
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (destinationId) where.destinationId = destinationId;

  const incidents = await prisma.incidentReport.findMany({
    where,
    include: { destination: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
    take: 500,
  });
  return NextResponse.json({ incidents });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reav/incidents" });

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

    const incident = await prisma.incidentReport.create({
      data: {
        tenantId,
        date: new Date(d.date),
        location: d.location,
        destinationId: d.destinationId ?? null,
        severity: d.severity,
        description: d.description,
        personsInvolved: d.personsInvolved ?? null,
        actionsTaken: d.actionsTaken ?? null,
        followUp: d.followUp ?? null,
        reportedBy: d.reportedBy,
        status: d.status ?? "open",
      },
      include: { destination: { select: { id: true, name: true } } },
    });

    log.info({ incidentId: incident.id }, "Incident report created");
    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create incident report");
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }
}
