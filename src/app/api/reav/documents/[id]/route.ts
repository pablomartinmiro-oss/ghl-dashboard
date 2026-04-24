import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const DOC_TYPES = [
  "risk_assessment",
  "emergency_plan",
  "safety_protocol",
  "insurance_cert",
  "instructor_cert",
  "equipment_check",
  "incident_report",
  "other",
] as const;
const STATUSES = ["draft", "active", "expired", "archived"] as const;
const CATEGORIES = ["general", "snow", "mountain", "water", "equipment"] as const;

const updateSchema = z.object({
  type: z.enum(DOC_TYPES).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  fileUrl: z.string().max(500).nullable().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
  reviewedBy: z.string().max(120).nullable().optional(),
  reviewedAt: z.string().datetime().nullable().optional(),
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

  const document = await prisma.safetyDocument.findFirst({
    where: { id, tenantId },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json({ document });
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
  const log = logger.child({ tenantId, path: `/api/reav/documents/${id}` });

  try {
    const existing = await prisma.safetyDocument.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
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

    const data: Prisma.SafetyDocumentUpdateInput = {};
    if (d.type !== undefined) data.type = d.type;
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description;
    if (d.fileUrl !== undefined) data.fileUrl = d.fileUrl;
    if (d.validFrom !== undefined) data.validFrom = d.validFrom ? new Date(d.validFrom) : null;
    if (d.validUntil !== undefined) data.validUntil = d.validUntil ? new Date(d.validUntil) : null;
    if (d.status !== undefined) data.status = d.status;
    if (d.category !== undefined) data.category = d.category;
    if (d.assignedTo !== undefined) data.assignedTo = d.assignedTo;
    if (d.reviewedBy !== undefined) data.reviewedBy = d.reviewedBy;
    if (d.reviewedAt !== undefined) data.reviewedAt = d.reviewedAt ? new Date(d.reviewedAt) : null;

    const document = await prisma.safetyDocument.update({ where: { id }, data });
    log.info({ documentId: id }, "Safety document updated");
    return NextResponse.json({ document });
  } catch (error) {
    log.error({ error }, "Failed to update safety document");
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
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
  const log = logger.child({ tenantId, path: `/api/reav/documents/${id}` });

  const existing = await prisma.safetyDocument.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  await prisma.safetyDocument.delete({ where: { id } });
  log.info({ documentId: id }, "Safety document deleted");
  return NextResponse.json({ success: true });
}
