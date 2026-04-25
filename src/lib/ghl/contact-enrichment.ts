import { getGHLClient } from "@/lib/ghl/api";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { syncContactFields } from "@/lib/ghl/field-sync";

const log = logger.child({ layer: "ghl-enrichment" });

export type LoyaltyTier = "new" | "bronze" | "silver" | "gold";

export function calculateLoyaltyTier(totalBookings: number): LoyaltyTier {
  if (totalBookings >= 10) return "gold";
  if (totalBookings >= 5) return "silver";
  if (totalBookings >= 2) return "bronze";
  return "new";
}

interface CustomFieldRecord {
  total_bookings?: string | number;
  total_spent_eur?: string | number;
}

export async function enrichContactOnBooking(
  tenantId: string,
  contactId: string,
  booking: {
    destination: string;
    totalCents: number;
    date: Date;
  },
): Promise<void> {
  try {
    const cached = await prisma.cachedContact.findFirst({
      where: { id: contactId, tenantId },
    });

    let prevBookings = 0;
    let prevSpentEur = 0;
    let existingTags: string[] = [];

    if (cached) {
      const cf = (cached.customFields ?? {}) as CustomFieldRecord;
      prevBookings = Number(cf.total_bookings ?? 0) || 0;
      prevSpentEur = Number(cf.total_spent_eur ?? 0) || 0;
      existingTags = Array.isArray(cached.tags) ? (cached.tags as string[]) : [];
    } else {
      try {
        const ghl = await getGHLClient(tenantId);
        const remote = await ghl.getContact(contactId);
        const cf = (remote.customFields ?? {}) as CustomFieldRecord;
        prevBookings = Number(cf.total_bookings ?? 0) || 0;
        prevSpentEur = Number(cf.total_spent_eur ?? 0) || 0;
        existingTags = remote.tags ?? [];
      } catch (err) {
        log.warn({ tenantId, contactId, error: err }, "Could not fetch contact for enrichment — starting fresh");
      }
    }

    const newBookings = prevBookings + 1;
    const bookingEur = booking.totalCents / 100;
    const newSpentEur = Math.round((prevSpentEur + bookingEur) * 100) / 100;
    const tier = calculateLoyaltyTier(newBookings);
    const seasonYear = String(booking.date.getFullYear());
    const dateIso = booking.date.toISOString().split("T")[0];

    const newTags = Array.from(
      new Set([...existingTags, booking.destination, `temporada-${seasonYear}`, `tier-${tier}`]),
    );

    await syncContactFields(tenantId, contactId, {
      last_destination: booking.destination,
      total_bookings: newBookings,
      total_spent_eur: newSpentEur,
      last_booking_date: dateIso,
      loyalty_tier: tier,
    });

    try {
      const ghl = await getGHLClient(tenantId);
      await ghl.updateContact(contactId, { tags: newTags });
    } catch (err) {
      log.warn({ tenantId, contactId, error: err }, "Failed to update tags on GHL contact");
    }

    log.info(
      { tenantId, contactId, newBookings, newSpentEur, tier, destination: booking.destination },
      "Enriched contact on booking",
    );
  } catch (err) {
    log.error({ tenantId, contactId, error: err }, "Failed to enrich contact on booking");
  }
}
