import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "groups" });

const createSchema = z.object({
  name: z.string().min(1).max(160),
  organizerName: z.string().min(1).max(120),
  organizerEmail: z.string().email(),
  organizerPhone: z.string().max(40).nullable().optional(),
  type: z.enum(["school", "company", "club", "family", "other"]),
  estimatedSize: z.number().int().min(1).max(2000),
  destinationId: z.string().nullable().optional(),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  depositCents: z.number().int().nullable().optional(),
  totalCents: z.number().int().nullable().optional(),
  discountPct: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(["inquiry", "quoted", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().max(5000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const where: Prisma.GroupBookingWhereInput = { tenantId };
    const status = sp.get("status");
    const type = sp.get("type");
    const search = sp.get("search");
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { organizerName: { contains: search, mode: "insensitive" } },
        { organizerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const groups = await prisma.groupBooking.findMany({
      where,
      include: {
        destination: { select: { id: true, name: true, slug: true } },
        _count: { select: { members: true } },
      },
      orderBy: [{ startDate: "desc" }],
    });
    return NextResponse.json({ groups });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to fetch groups");
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
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

    const group = await prisma.groupBooking.create({
      data: {
        tenantId,
        name: d.name,
        organizerName: d.organizerName,
        organizerEmail: d.organizerEmail,
        organizerPhone: d.organizerPhone ?? null,
        type: d.type,
        estimatedSize: d.estimatedSize,
        destinationId: d.destinationId ?? null,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        depositCents: d.depositCents ?? null,
        totalCents: d.totalCents ?? null,
        discountPct: d.discountPct ?? null,
        status: d.status ?? "inquiry",
        notes: d.notes ?? null,
        metadata: d.metadata ? (JSON.parse(JSON.stringify(d.metadata)) as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to create group");
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
