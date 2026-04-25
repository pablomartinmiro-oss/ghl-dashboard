import { prisma } from "@/lib/db";

/**
 * Calculate occupancy percentage from inventory reservations vs total inventory items
 * for a given destination on a specific date.
 *
 * Returns percentage 0-100. Returns 0 if no inventory exists for the destination.
 */
export async function getOccupancy(
  tenantId: string,
  destinationId: string,
  date: Date,
): Promise<number> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const [totalItems, reservedCount] = await Promise.all([
    prisma.inventoryItem.count({
      where: {
        tenantId,
        destinationId,
        status: { not: "retired" },
      },
    }),
    prisma.inventoryReservation.count({
      where: {
        tenantId,
        item: { destinationId },
        status: { in: ["reserved", "checked_out"] },
        startDate: { lte: dayEnd },
        endDate: { gte: dayStart },
      },
    }),
  ]);

  if (totalItems === 0) return 0;
  const pct = Math.round((reservedCount / totalItems) * 100);
  return Math.max(0, Math.min(100, pct));
}
