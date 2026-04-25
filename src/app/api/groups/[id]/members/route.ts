import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "groups:members" });

const memberSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().nullable().optional(),
  age: z.number().int().min(0).max(120).nullable().optional(),
  heightCm: z.number().int().min(40).max(230).nullable().optional(),
  weightKg: z.number().int().min(5).max(250).nullable().optional(),
  shoeSize: z.string().max(10).nullable().optional(),
  skiLevel: z.string().max(40).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const postSchema = z.union([
  memberSchema,
  z.object({ members: z.array(memberSchema) }),
]);

async function ensureGroup(id: string, tenantId: string) {
  const group = await prisma.groupBooking.findFirst({ where: { id, tenantId } });
  return group;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const group = await ensureGroup(id, tenantId);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const group = await ensureGroup(id, tenantId);
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const list = "members" in parsed.data ? parsed.data.members : [parsed.data];
    const created = await prisma.groupMember.createManyAndReturn({
      data: list.map((m) => ({
        groupId: id,
        name: m.name,
        email: m.email ?? null,
        age: m.age ?? null,
        heightCm: m.heightCm ?? null,
        weightKg: m.weightKg ?? null,
        shoeSize: m.shoeSize ?? null,
        skiLevel: m.skiLevel ?? null,
        notes: m.notes ?? null,
      })),
    });

    return NextResponse.json({ members: created }, { status: 201 });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to add members");
    return NextResponse.json({ error: "Failed to add members" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const group = await ensureGroup(id, tenantId);
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const memberId = request.nextUrl.searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId query param required" }, { status: 400 });
    }

    const member = await prisma.groupMember.findFirst({ where: { id: memberId, groupId: id } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    await prisma.groupMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to delete member");
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
