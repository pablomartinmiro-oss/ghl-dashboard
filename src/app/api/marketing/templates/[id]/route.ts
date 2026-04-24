import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const CATEGORIES = [
  "promotional",
  "transactional",
  "newsletter",
  "welcome",
  "reminder",
] as const;

const variableSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  subject: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(50_000).optional(),
  category: z.enum(CATEGORIES).nullable().optional(),
  variables: z.array(variableSchema).optional(),
  isDefault: z.boolean().optional(),
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

  const template = await prisma.emailTemplate.findFirst({
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
  const log = logger.child({ tenantId, path: `/api/marketing/templates/${id}` });

  try {
    const existing = await prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
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

    const data: Prisma.EmailTemplateUpdateInput = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.subject !== undefined) data.subject = d.subject;
    if (d.body !== undefined) data.body = d.body;
    if (d.category !== undefined) data.category = d.category;
    if (d.variables !== undefined) {
      data.variables = d.variables as Prisma.InputJsonValue;
    }
    if (d.isDefault !== undefined) data.isDefault = d.isDefault;

    const template = await prisma.emailTemplate.update({
      where: { id },
      data,
    });
    log.info({ templateId: id }, "Template updated");
    return NextResponse.json({ template });
  } catch (error) {
    log.error({ error }, "Failed to update template");
    return NextResponse.json(
      { error: "Failed to update template" },
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
  const log = logger.child({ tenantId, path: `/api/marketing/templates/${id}` });

  const existing = await prisma.emailTemplate.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  await prisma.emailTemplate.delete({ where: { id } });
  log.info({ templateId: id }, "Template deleted");
  return NextResponse.json({ success: true });
}
