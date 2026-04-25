import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const slotSchema = z.object({
  date: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isAvailable: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const putSchema = z.object({
  slots: z.array(slotSchema),
  replaceRange: z.object({ from: z.string(), to: z.string() }).optional(),
});

async function ensureInstructor(tenantId: string, instructorId: string) {
  return prisma.instructor.findFirst({ where: { id: instructorId, tenantId } });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  const ins = await ensureInstructor(session.user.tenantId, id);
  if (!ins) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const where: { instructorId: string; date?: { gte?: Date; lte?: Date } } = { instructorId: id };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const availability = await prisma.instructorAvailability.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ availability });
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ins = await ensureInstructor(session.user.tenantId, id);
  if (!ins) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    const d = parsed.data;

    await prisma.$transaction(async (tx) => {
      if (d.replaceRange) {
        await tx.instructorAvailability.deleteMany({
          where: {
            instructorId: id,
            date: {
              gte: new Date(d.replaceRange.from),
              lte: new Date(`${d.replaceRange.to}T23:59:59.999Z`),
            },
          },
        });
      }
      for (const s of d.slots) {
        const date = new Date(s.date);
        date.setHours(0, 0, 0, 0);
        await tx.instructorAvailability.upsert({
          where: { instructorId_date_startTime: { instructorId: id, date, startTime: s.startTime } },
          create: {
            instructorId: id,
            date,
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: s.isAvailable ?? true,
            notes: s.notes ?? null,
          },
          update: {
            endTime: s.endTime,
            isAvailable: s.isAvailable ?? true,
            notes: s.notes ?? null,
          },
        });
      }
    });

    const availability = await prisma.instructorAvailability.findMany({
      where: { instructorId: id },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json({ availability });
  } catch (error) {
    logger.error({ error }, "Failed to update availability");
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}
