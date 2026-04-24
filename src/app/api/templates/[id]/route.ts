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

const updateSchema = z.object({
  type: z.enum(DOCUMENT_TYPES).optional(),
  name: z.string().min(1).max(160).optional(),
  subject: z.string().max(300).nullable().optional(),
  htmlBody: z.string().min(1).max(200_000).optional(),
  variables: z.array(variableSchema).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
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

  const template = await prisma.documentTemplate.findFirst({
    where: { id, tenantId },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ template });
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
  const log = logger.child({ tenantId, path: `/api/templates/${id}` });

  try {
    const existing = await prisma.documentTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
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

    const data: Prisma.DocumentTemplateUpdateInput = {};
    if (d.type !== undefined) data.type = d.type;
    if (d.name !== undefined) data.name = d.name;
    if (d.subject !== undefined) data.subject = d.subject;
    if (d.htmlBody !== undefined) data.htmlBody = d.htmlBody;
    if (d.variables !== undefined) data.variables = d.variables as Prisma.InputJsonValue;
    if (d.active !== undefined) data.active = d.active;

    if (d.isDefault === true) {
      const targetType = d.type ?? existing.type;
      await prisma.documentTemplate.updateMany({
        where: { tenantId, type: targetType, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      data.isDefault = true;
    } else if (d.isDefault === false) {
      data.isDefault = false;
    }

    const template = await prisma.documentTemplate.update({
      where: { id },
      data,
    });
    log.info({ templateId: id }, "Document template updated");
    return NextResponse.json({ template });
  } catch (error) {
    log.error({ error }, "Failed to update document template");
    return NextResponse.json(
      { error: "Failed to update document template" },
      { status: 500 }
    );
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
  const log = logger.child({ tenantId, path: `/api/templates/${id}` });

  const existing = await prisma.documentTemplate.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  await prisma.documentTemplate.delete({ where: { id } });
  log.info({ templateId: id }, "Document template deleted");
  return NextResponse.json({ success: true });
}
