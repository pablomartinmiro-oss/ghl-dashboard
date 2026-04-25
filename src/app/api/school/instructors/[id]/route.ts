import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const patchSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  languages: z.array(z.string()).optional(),
  specialties: z.array(z.string()).nullable().optional(),
  level: z.enum(["td1", "td2", "td3"]).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  hourlyRate: z.number().int().nullable().optional(),
  commissionPct: z.number().nullable().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const instructor = await prisma.instructor.findFirst({
    where: { id, tenantId },
    include: {
      certifications: { orderBy: { issuedAt: "desc" } },
      availability: { orderBy: { date: "asc" }, take: 365 },
      lessons: {
        orderBy: { date: "desc" },
        take: 50,
        include: { _count: { select: { students: true } } },
      },
    },
  });
  if (!instructor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ instructor });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const existing = await prisma.instructor.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const data: Prisma.InstructorUpdateInput = {};
    if (d.firstName !== undefined) data.firstName = d.firstName;
    if (d.lastName !== undefined) data.lastName = d.lastName;
    if (d.email !== undefined) data.email = d.email;
    if (d.phone !== undefined) data.phone = d.phone;
    if (d.languages !== undefined) data.languages = d.languages as Prisma.InputJsonValue;
    if (d.specialties !== undefined) data.specialties = (d.specialties ?? []) as Prisma.InputJsonValue;
    if (d.level !== undefined) data.level = d.level;
    if (d.bio !== undefined) data.bio = d.bio;
    if (d.photoUrl !== undefined) data.photoUrl = d.photoUrl;
    if (d.hourlyRate !== undefined) data.hourlyRate = d.hourlyRate;
    if (d.commissionPct !== undefined) data.commissionPct = d.commissionPct;
    if (d.status !== undefined) data.status = d.status;

    const instructor = await prisma.instructor.update({ where: { id }, data });
    return NextResponse.json({ instructor });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to update instructor");
    return NextResponse.json({ error: "Failed to update instructor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const existing = await prisma.instructor.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.instructor.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
