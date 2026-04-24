import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { DOCUMENT_TYPES } from "@/lib/templates/defaults";
import type { Prisma } from "@/generated/prisma/client";

const variableSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
});

const createSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  name: z.string().min(1).max(160),
  subject: z.string().max(300).nullable().optional(),
  htmlBody: z.string().min(1).max(200_000),
  variables: z.array(variableSchema).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");

  const where: Prisma.DocumentTemplateWhereInput = { tenantId };
  if (type && (DOCUMENT_TYPES as readonly string[]).includes(type)) {
    where.type = type;
  }

  const templates = await prisma.documentTemplate.findMany({
    where,
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/templates" });

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

    if (d.isDefault) {
      await prisma.documentTemplate.updateMany({
        where: { tenantId, type: d.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.documentTemplate.create({
      data: {
        tenantId,
        type: d.type,
        name: d.name,
        subject: d.subject ?? null,
        htmlBody: d.htmlBody,
        variables: (d.variables ?? []) as Prisma.InputJsonValue,
        isDefault: d.isDefault ?? false,
        active: d.active ?? true,
      },
    });

    log.info({ templateId: template.id, type: d.type }, "Document template created");
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create document template");
    return NextResponse.json(
      { error: "Failed to create document template" },
      { status: 500 }
    );
  }
}
