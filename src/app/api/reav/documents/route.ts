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

const createSchema = z.object({
  type: z.enum(DOC_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  fileUrl: z.string().max(500).nullable().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;

  const where: Prisma.SafetyDocumentWhereInput = { tenantId };
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  if (type) where.type = type;
  if (status) where.status = status;
  if (category) where.category = category;

  const documents = await prisma.safetyDocument.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reav/documents" });

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

    const document = await prisma.safetyDocument.create({
      data: {
        tenantId,
        type: d.type,
        title: d.title,
        description: d.description ?? null,
        fileUrl: d.fileUrl ?? null,
        validFrom: d.validFrom ? new Date(d.validFrom) : null,
        validUntil: d.validUntil ? new Date(d.validUntil) : null,
        status: d.status ?? "draft",
        category: d.category ?? null,
        assignedTo: d.assignedTo ?? null,
      },
    });

    log.info({ documentId: document.id }, "Safety document created");
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create safety document");
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
