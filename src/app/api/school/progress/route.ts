import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const upsertSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(160),
  currentLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  totalLessons: z.number().int().min(0).optional(),
  totalHours: z.number().min(0).optional(),
  achievements: z.array(z.string()).optional(),
  lastLessonDate: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const email = request.nextUrl.searchParams.get("email");

  try {
    if (email) {
      const progress = await prisma.studentProgress.findUnique({
        where: { tenantId_customerEmail: { tenantId, customerEmail: email } },
      });
      return NextResponse.json({ progress });
    }

    const search = request.nextUrl.searchParams.get("search");
    const where: Prisma.StudentProgressWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const progress = await prisma.studentProgress.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ progress });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch student progress");
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
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

    const lastLessonDate = d.lastLessonDate ? new Date(d.lastLessonDate) : null;

    const progress = await prisma.studentProgress.upsert({
      where: { tenantId_customerEmail: { tenantId, customerEmail: d.customerEmail } },
      create: {
        tenantId,
        customerEmail: d.customerEmail,
        customerName: d.customerName,
        currentLevel: d.currentLevel,
        totalLessons: d.totalLessons ?? 0,
        totalHours: d.totalHours ?? 0,
        achievements: (d.achievements ?? []) as Prisma.InputJsonValue,
        lastLessonDate,
        notes: d.notes ?? null,
      },
      update: {
        customerName: d.customerName,
        currentLevel: d.currentLevel,
        ...(d.totalLessons !== undefined ? { totalLessons: d.totalLessons } : {}),
        ...(d.totalHours !== undefined ? { totalHours: d.totalHours } : {}),
        ...(d.achievements !== undefined ? { achievements: d.achievements as Prisma.InputJsonValue } : {}),
        ...(d.lastLessonDate !== undefined ? { lastLessonDate } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to upsert student progress");
    return NextResponse.json({ error: "Failed to upsert progress" }, { status: 500 });
  }
}
