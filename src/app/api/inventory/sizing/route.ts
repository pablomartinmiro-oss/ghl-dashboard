import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const upsertSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(200),
  heightCm: z.number().int().nullable().optional(),
  weightKg: z.number().int().nullable().optional(),
  shoeSize: z.string().max(20).nullable().optional(),
  age: z.number().int().nullable().optional(),
  level: z.string().max(40).nullable().optional(),
  skiLength: z.string().max(20).nullable().optional(),
  bootSize: z.string().max(20).nullable().optional(),
  helmetSize: z.string().max(20).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;
  const email = sp.get("email");

  try {
    if (email) {
      const profile = await prisma.sizingProfile.findUnique({
        where: { tenantId_customerEmail: { tenantId, customerEmail: email } },
      });
      return NextResponse.json({ profile });
    }
    const profiles = await prisma.sizingProfile.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return NextResponse.json({ profiles });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch sizing profiles");
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const d = parsed.data;
    const profile = await prisma.sizingProfile.upsert({
      where: { tenantId_customerEmail: { tenantId, customerEmail: d.customerEmail } },
      create: {
        tenantId,
        customerEmail: d.customerEmail,
        customerName: d.customerName,
        heightCm: d.heightCm ?? null,
        weightKg: d.weightKg ?? null,
        shoeSize: d.shoeSize ?? null,
        age: d.age ?? null,
        level: d.level ?? null,
        skiLength: d.skiLength ?? null,
        bootSize: d.bootSize ?? null,
        helmetSize: d.helmetSize ?? null,
        notes: d.notes ?? null,
      },
      update: {
        customerName: d.customerName,
        heightCm: d.heightCm ?? null,
        weightKg: d.weightKg ?? null,
        shoeSize: d.shoeSize ?? null,
        age: d.age ?? null,
        level: d.level ?? null,
        skiLength: d.skiLength ?? null,
        bootSize: d.bootSize ?? null,
        helmetSize: d.helmetSize ?? null,
        notes: d.notes ?? null,
      },
    });
    return NextResponse.json({ profile });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to upsert sizing profile");
    return NextResponse.json({ error: "Failed to upsert profile" }, { status: 500 });
  }
}
