import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const ACTIONS = ["checkout", "return", "cancel"] as const;

const patchSchema = z.object({
  action: z.enum(ACTIONS),
  damageNotes: z.string().max(2000).nullable().optional(),
});

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
    const reservation = await prisma.inventoryReservation.findFirst({ where: { id, tenantId } });
    if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();

    if (parsed.data.action === "checkout") {
      const updated = await prisma.inventoryReservation.update({
        where: { id },
        data: { status: "checked_out", checkedOutAt: now },
      });
      await prisma.inventoryItem.update({ where: { id: reservation.itemId }, data: { status: "rented" } });
      return NextResponse.json({ reservation: updated });
    }

    if (parsed.data.action === "return") {
      const updated = await prisma.inventoryReservation.update({
        where: { id },
        data: {
          status: "returned",
          returnedAt: now,
          damageNotes: parsed.data.damageNotes ?? reservation.damageNotes,
        },
      });
      await prisma.inventoryItem.update({
        where: { id: reservation.itemId },
        data: {
          status: parsed.data.damageNotes ? "maintenance" : "available",
          totalRentals: { increment: 1 },
        },
      });
      return NextResponse.json({ reservation: updated });
    }

    // cancel
    const updated = await prisma.inventoryReservation.update({
      where: { id },
      data: { status: "cancelled" },
    });
    if (reservation.status === "reserved") {
      await prisma.inventoryItem.update({ where: { id: reservation.itemId }, data: { status: "available" } });
    }
    return NextResponse.json({ reservation: updated });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to update inventory reservation");
    return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
  }
}
