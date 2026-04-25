import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { enrichLessonContact } from "@/lib/school/ghl-enrich";

const studentSchema = z.object({
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email().nullable().optional(),
  age: z.number().int().min(1).max(120).nullable().optional(),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  reservationId: z.string().nullable().optional(),
});

async function ensureLesson(tenantId: string, lessonId: string) {
  return prisma.lessonBooking.findFirst({ where: { id: lessonId, tenantId } });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const lesson = await ensureLesson(session.user.tenantId, id);
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const students = await prisma.lessonStudent.findMany({ where: { lessonId: id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ students });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;
  const lesson = await ensureLesson(tenantId, id);
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (lesson.currentStudents >= lesson.maxStudents) {
    return NextResponse.json({ error: "Lesson is full" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = studentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    const d = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.lessonStudent.create({
        data: {
          lessonId: id,
          customerName: d.customerName,
          customerEmail: d.customerEmail ?? null,
          age: d.age ?? null,
          level: d.level ?? null,
          notes: d.notes ?? null,
          reservationId: d.reservationId ?? null,
        },
      });
      await tx.lessonBooking.update({ where: { id }, data: { currentStudents: { increment: 1 } } });

      if (d.customerEmail) {
        const lessonHours = computeLessonHours(lesson.startTime, lesson.endTime);
        await tx.studentProgress.upsert({
          where: { tenantId_customerEmail: { tenantId, customerEmail: d.customerEmail } },
          create: {
            tenantId,
            customerEmail: d.customerEmail,
            customerName: d.customerName,
            currentLevel: d.level ?? "beginner",
            totalLessons: 1,
            totalHours: lessonHours,
            lastLessonDate: lesson.date,
          },
          update: {
            customerName: d.customerName,
            totalLessons: { increment: 1 },
            totalHours: { increment: lessonHours },
            lastLessonDate: lesson.date,
            ...(d.level ? { currentLevel: d.level } : {}),
          },
        });
      }

      return student;
    });

    if (d.customerEmail) {
      enrichLessonContact(tenantId, {
        email: d.customerEmail,
        name: d.customerName,
        level: d.level ?? null,
        date: lesson.date,
      }).catch((err) => logger.warn({ err }, "GHL enrichment failed (lesson)"));
    }

    return NextResponse.json({ student: result }, { status: 201 });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to add student");
    return NextResponse.json({ error: "Failed to add student" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const lesson = await ensureLesson(tenantId, id);
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const student = await prisma.lessonStudent.findFirst({ where: { id: studentId, lessonId: id } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.lessonStudent.delete({ where: { id: studentId } });
    if (lesson.currentStudents > 0) {
      await tx.lessonBooking.update({ where: { id }, data: { currentStudents: { decrement: 1 } } });
    }
  });

  return NextResponse.json({ success: true });
}

function computeLessonHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const mins = (eh ?? 0) * 60 + (em ?? 0) - ((sh ?? 0) * 60 + (sm ?? 0));
  return Math.max(0, Math.round((mins / 60) * 100) / 100);
}
