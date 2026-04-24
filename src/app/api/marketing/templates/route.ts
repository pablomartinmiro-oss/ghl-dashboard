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

const createSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(50_000),
  category: z.enum(CATEGORIES).nullable().optional(),
  variables: z.array(variableSchema).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");

  const where: Prisma.EmailTemplateWhereInput = { tenantId };
  if (category) where.category = category;

  const templates = await prisma.emailTemplate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
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
  const log = logger.child({ tenantId, path: "/api/marketing/templates" });

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

    const template = await prisma.emailTemplate.create({
      data: {
        tenantId,
        name: d.name,
        subject: d.subject,
        body: d.body,
        category: d.category ?? null,
        variables: (d.variables ?? []) as Prisma.InputJsonValue,
        isDefault: d.isDefault ?? false,
      },
    });

    log.info({ templateId: template.id }, "Template created");
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create template");
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
