import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "groups:templates" });

const createSchema = z.object({
  name: z.string().min(1).max(160),
  type: z.enum(["school", "company", "club", "family", "other"]),
  defaultSize: z.number().int().min(1).max(2000),
  defaultDays: z.number().int().min(1).max(60).optional(),
  includesEquipment: z.boolean().optional(),
  includesLessons: z.boolean().optional(),
  discountPct: z.number().min(0).max(100).nullable().optional(),
  pricePerPersonCents: z.number().int().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const templates = await prisma.groupTemplate.findMany({
      where: { tenantId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ templates });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to fetch templates");
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const d = parsed.data;

    const template = await prisma.groupTemplate.create({
      data: {
        tenantId,
        name: d.name,
        type: d.type,
        defaultSize: d.defaultSize,
        defaultDays: d.defaultDays ?? 1,
        includesEquipment: d.includesEquipment ?? true,
        includesLessons: d.includesLessons ?? false,
        discountPct: d.discountPct ?? null,
        pricePerPersonCents: d.pricePerPersonCents ?? null,
        description: d.description ?? null,
      },
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to create template");
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
