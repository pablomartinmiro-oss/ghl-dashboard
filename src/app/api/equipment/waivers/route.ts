import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "equipment:waivers" });

const createSchema = z.object({
  customerName: z.string().min(1).max(150),
  customerEmail: z.string().email().nullable().optional(),
  equipmentId: z.string().nullable().optional(),
  signatureData: z.string().nullable().optional(),
  reservationId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const where: Prisma.DigitalWaiverWhereInput = { tenantId };
    const equipmentId = sp.get("equipmentId");
    const reservationId = sp.get("reservationId");
    if (equipmentId) where.equipmentId = equipmentId;
    if (reservationId) where.reservationId = reservationId;

    const waivers = await prisma.digitalWaiver.findMany({
      where,
      include: { equipment: { select: { id: true, brand: true, model: true, serialNumber: true } } },
      orderBy: { signedAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ waivers });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to fetch waivers");
    return NextResponse.json({ error: "Failed to fetch waivers" }, { status: 500 });
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

    const waiver = await prisma.digitalWaiver.create({
      data: {
        tenantId,
        customerName: d.customerName,
        customerEmail: d.customerEmail ?? null,
        equipmentId: d.equipmentId ?? null,
        signatureData: d.signatureData ?? null,
        reservationId: d.reservationId ?? null,
        metadata: d.metadata
          ? (JSON.parse(JSON.stringify(d.metadata)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ waiver }, { status: 201 });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to create waiver");
    return NextResponse.json({ error: "Failed to create waiver" }, { status: 500 });
  }
}
