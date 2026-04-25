import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const patchSchema = z.object({
  instructorId: z.string().nullable().optional(),
  destinationId: z.string().nullable().optional(),
  type: z.enum(["group", "private", "adaptive", "children_group"]).optional(),
  date: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxStudents: z.number().int().min(1).max(50).optional(),
  studentLevel: z.string().nullable().optional(),
  language: z.string().min(2).max(8).optional(),
  priceCents: z.number().int().min(0).optional(),
  status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const lesson = await prisma.lessonBooking.findFirst({
    where: { id, tenantId },
    include: {
      instructor: { select: { id: true, firstName: true, lastName: true, level: true, languages: true, specialties: true } },
      destination: { select: { id: true, name: true, slug: true } },
      students: true,
    },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lesson });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    const existing = await prisma.lessonBooking.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const data: Prisma.LessonBookingUpdateInput = {};
    if (d.instructorId !== undefined) data.instructor = d.instructorId ? { connect: { id: d.instructorId } } : { disconnect: true };
    if (d.destinationId !== undefined) data.destination = d.destinationId ? { connect: { id: d.destinationId } } : { disconnect: true };
    if (d.type !== undefined) data.type = d.type;
    if (d.date !== undefined) {
      const date = new Date(d.date);
      date.setHours(0, 0, 0, 0);
      data.date = date;
    }
    if (d.startTime !== undefined) data.startTime = d.startTime;
    if (d.endTime !== undefined) data.endTime = d.endTime;
    if (d.maxStudents !== undefined) data.maxStudents = d.maxStudents;
    if (d.studentLevel !== undefined) data.studentLevel = d.studentLevel;
    if (d.language !== undefined) data.language = d.language;
    if (d.priceCents !== undefined) data.priceCents = d.priceCents;
    if (d.status !== undefined) data.status = d.status;
    if (d.notes !== undefined) data.notes = d.notes;

    const lesson = await prisma.lessonBooking.update({ where: { id }, data });
    return NextResponse.json({ lesson });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to update lesson");
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const existing = await prisma.lessonBooking.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lessonBooking.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
