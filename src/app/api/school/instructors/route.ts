import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const createSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  languages: z.array(z.string()).min(1),
  specialties: z.array(z.string()).optional(),
  level: z.enum(["td1", "td2", "td3"]).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  hourlyRate: z.number().int().nullable().optional(),
  commissionPct: z.number().nullable().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const where: Prisma.InstructorWhereInput = { tenantId };
    const status = sp.get("status");
    const search = sp.get("search");
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const instructors = await prisma.instructor.findMany({
      where,
      include: {
        certifications: { orderBy: { issuedAt: "desc" } },
        _count: { select: { lessons: true } },
      },
      orderBy: [{ status: "asc" }, { lastName: "asc" }],
    });

    return NextResponse.json({ instructors });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch instructors");
    return NextResponse.json({ error: "Failed to fetch instructors" }, { status: 500 });
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

    const instructor = await prisma.instructor.create({
      data: {
        tenantId,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email ?? null,
        phone: d.phone ?? null,
        languages: d.languages as Prisma.InputJsonValue,
        specialties: (d.specialties ?? []) as Prisma.InputJsonValue,
        level: d.level ?? null,
        bio: d.bio ?? null,
        photoUrl: d.photoUrl ?? null,
        hourlyRate: d.hourlyRate ?? null,
        commissionPct: d.commissionPct ?? null,
        status: d.status ?? "active",
      },
    });

    return NextResponse.json({ instructor }, { status: 201 });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to create instructor");
    return NextResponse.json({ error: "Failed to create instructor" }, { status: 500 });
  }
}
