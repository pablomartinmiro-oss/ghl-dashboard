import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const createSchema = z.object({
  itemId: z.string().min(1),
  reservationId: z.string().nullable().optional(),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().nullable().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const where: Prisma.InventoryReservationWhereInput = { tenantId };
    const itemId = sp.get("itemId");
    const status = sp.get("status");
    const from = sp.get("from");
    const to = sp.get("to");
    if (itemId) where.itemId = itemId;
    if (status) where.status = status;
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to) where.startDate.lte = new Date(to);
    }

    const reservations = await prisma.inventoryReservation.findMany({
      where,
      include: { item: { include: { category: true, destination: { select: { id: true, name: true } } } } },
      orderBy: { startDate: "desc" },
      take: 500,
    });
    return NextResponse.json({ reservations });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch inventory reservations");
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
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

    const item = await prisma.inventoryItem.findFirst({ where: { id: d.itemId, tenantId } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.status === "retired") {
      return NextResponse.json({ error: "Item retirado, no disponible" }, { status: 400 });
    }

    const startDate = new Date(d.startDate);
    const endDate = new Date(d.endDate);
    if (endDate <= startDate) {
      return NextResponse.json({ error: "endDate must be after startDate" }, { status: 400 });
    }

    const overlap = await prisma.inventoryReservation.findFirst({
      where: {
        itemId: d.itemId,
        status: { in: ["reserved", "checked_out"] },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
    if (overlap) {
      return NextResponse.json({ error: "Item ya reservado en esas fechas" }, { status: 409 });
    }

    const reservation = await prisma.inventoryReservation.create({
      data: {
        tenantId,
        itemId: d.itemId,
        reservationId: d.reservationId ?? null,
        customerName: d.customerName,
        customerEmail: d.customerEmail ?? null,
        startDate,
        endDate,
        status: "reserved",
      },
    });
    await prisma.inventoryItem.update({ where: { id: d.itemId }, data: { status: "reserved" } });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to create inventory reservation");
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }
}
