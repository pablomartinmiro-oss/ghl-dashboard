import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const LESSON_TYPES = ["group", "private", "adaptive", "children_group"] as const;
const LESSON_STATUS = ["scheduled", "confirmed", "in_progress", "completed", "cancelled"] as const;

const createSchema = z.object({
  instructorId: z.string().nullable().optional(),
  destinationId: z.string().nullable().optional(),
  type: z.enum(LESSON_TYPES),
  date: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxStudents: z.number().int().min(1).max(50).optional(),
  studentLevel: z.string().nullable().optional(),
  language: z.string().min(2).max(8).optional(),
  priceCents: z.number().int().min(0),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const where: Prisma.LessonBookingWhereInput = { tenantId };
    const date = sp.get("date");
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");
    const instructorId = sp.get("instructorId");
    const type = sp.get("type");
    const status = sp.get("status");

    if (date) {
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      where.date = { gte: day, lt: next };
    } else if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    if (instructorId) where.instructorId = instructorId;
    if (type) where.type = type;
    if (status) where.status = status;

    const lessons = await prisma.lessonBooking.findMany({
      where,
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, level: true } },
        destination: { select: { id: true, name: true, slug: true } },
        students: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 500,
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch lessons");
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    const d = parsed.data;

    if (d.instructorId) {
      const ins = await prisma.instructor.findFirst({ where: { id: d.instructorId, tenantId } });
      if (!ins) return NextResponse.json({ error: "Instructor not found" }, { status: 400 });
    }
    if (d.destinationId) {
      const dest = await prisma.destination.findFirst({ where: { id: d.destinationId, tenantId } });
      if (!dest) return NextResponse.json({ error: "Destination not found" }, { status: 400 });
    }

    const date = new Date(d.date);
    date.setHours(0, 0, 0, 0);

    const defaultMax = d.type === "private" ? 1 : d.type === "children_group" ? 6 : d.type === "adaptive" ? 2 : 8;

    const lesson = await prisma.lessonBooking.create({
      data: {
        tenantId,
        instructorId: d.instructorId ?? null,
        destinationId: d.destinationId ?? null,
        type: d.type,
        date,
        startTime: d.startTime,
        endTime: d.endTime,
        maxStudents: d.maxStudents ?? defaultMax,
        studentLevel: d.studentLevel ?? null,
        language: d.language ?? "es",
        priceCents: d.priceCents,
        notes: d.notes ?? null,
      },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, level: true } },
        destination: { select: { id: true, name: true, slug: true } },
        students: true,
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to create lesson");
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 });
  }
}
