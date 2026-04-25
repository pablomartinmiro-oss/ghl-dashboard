import { getGHLClient } from "@/lib/ghl/api";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ layer: "ghl-workflows" });

export async function triggerWorkflow(
  tenantId: string,
  contactId: string,
  workflowId: string,
  eventData?: Record<string, string>,
): Promise<void> {
  if (!workflowId) {
    log.debug({ tenantId, contactId }, "Skipping workflow — no workflowId configured");
    return;
  }
  try {
    const ghl = await getGHLClient(tenantId);
    await ghl.addContactToWorkflow(contactId, workflowId, eventData);
    log.info({ tenantId, contactId, workflowId }, "Triggered GHL workflow");
  } catch (err) {
    log.error({ tenantId, contactId, workflowId, error: err }, "Failed to trigger GHL workflow");
  }
}

async function getConfig(tenantId: string) {
  return prisma.gHLAutomationConfig.findUnique({ where: { tenantId } });
}

export async function triggerBookingConfirmed(
  tenantId: string,
  contactId: string,
  booking: { destination: string; dates: string; amount: string },
): Promise<void> {
  const cfg = await getConfig(tenantId);
  if (!cfg?.autoSendTriggers || !cfg.workflowBookingConfirmed) return;
  await triggerWorkflow(tenantId, contactId, cfg.workflowBookingConfirmed, {
    destination: booking.destination,
    dates: booking.dates,
    amount: booking.amount,
  });
}

export async function triggerBookingReminder(
  tenantId: string,
  contactId: string,
  booking: { destination: string; date: string },
): Promise<void> {
  const cfg = await getConfig(tenantId);
  if (!cfg?.autoSendTriggers || !cfg.workflowBookingReminder) return;
  await triggerWorkflow(tenantId, contactId, cfg.workflowBookingReminder, {
    destination: booking.destination,
    date: booking.date,
  });
}

export async function triggerPostTripFollowUp(
  tenantId: string,
  contactId: string,
  booking: { destination: string },
): Promise<void> {
  const cfg = await getConfig(tenantId);
  if (!cfg?.autoSendTriggers || !cfg.workflowPostTrip) return;
  await triggerWorkflow(tenantId, contactId, cfg.workflowPostTrip, {
    destination: booking.destination,
  });
}

export async function triggerReviewRequest(
  tenantId: string,
  contactId: string,
  data: { reviewUrl: string },
): Promise<void> {
  const cfg = await getConfig(tenantId);
  if (!cfg?.autoSendTriggers || !cfg.workflowReviewRequest) return;
  await triggerWorkflow(tenantId, contactId, cfg.workflowReviewRequest, {
    reviewUrl: data.reviewUrl,
  });
}

export async function triggerEquipmentReady(
  tenantId: string,
  contactId: string,
  data: { pickupLocation: string; pickupTime: string },
): Promise<void> {
  const cfg = await getConfig(tenantId);
  if (!cfg?.autoSendTriggers || !cfg.workflowEquipmentReady) return;
  await triggerWorkflow(tenantId, contactId, cfg.workflowEquipmentReady, {
    pickupLocation: data.pickupLocation,
    pickupTime: data.pickupTime,
  });
}

export async function triggerAbandonedCart(
  tenantId: string,
  contactId: string,
  data: { products: string; total: string },
): Promise<void> {
  const cfg = await getConfig(tenantId);
  if (!cfg?.autoSendTriggers || !cfg.workflowAbandonedCart) return;
  await triggerWorkflow(tenantId, contactId, cfg.workflowAbandonedCart, {
    products: data.products,
    total: data.total,
  });
}
