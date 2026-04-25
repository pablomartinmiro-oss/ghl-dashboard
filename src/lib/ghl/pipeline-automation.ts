import { getGHLClient } from "@/lib/ghl/api";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { findStageByName } from "@/lib/ghl/stages";

const log = logger.child({ layer: "ghl-pipeline-automation" });

export const STAGE_NAMES = [
  "Nuevo Lead",
  "Presupuesto Enviado",
  "Reserva Confirmada",
  "Pagado",
  "Completado",
  "Reseña Recibida",
] as const;

export type StageName = (typeof STAGE_NAMES)[number];

export async function createOpportunityFromBooking(
  tenantId: string,
  contactId: string,
  booking: {
    name: string;
    destination: string;
    totalCents: number;
    pipelineId: string;
  },
): Promise<string | null> {
  try {
    const cfg = await prisma.gHLAutomationConfig.findUnique({ where: { tenantId } });
    if (!cfg?.autoCreateOpps) {
      log.debug({ tenantId, contactId }, "Auto-create opportunities disabled — skipping");
      return null;
    }

    const stageNuevo = cfg.stageReservaConfirmada ?? "Reserva Confirmada";
    const stage = await findStageByName(tenantId, stageNuevo);
    if (!stage) {
      log.warn({ tenantId, stageNuevo }, "Could not resolve initial stage for booking opportunity");
      return null;
    }

    const ghl = await getGHLClient(tenantId);
    const opp = await ghl.createOpportunity({
      pipelineId: booking.pipelineId || stage.pipelineId,
      pipelineStageId: stage.stageId,
      name: booking.name,
      contactId,
      monetaryValue: Math.round(booking.totalCents / 100),
      status: "open",
    });

    log.info(
      { tenantId, contactId, opportunityId: opp.id, destination: booking.destination },
      "Created GHL opportunity from booking",
    );
    return opp.id;
  } catch (err) {
    log.error({ tenantId, contactId, error: err }, "Failed to create opportunity from booking");
    return null;
  }
}

export async function moveOpportunityStage(
  tenantId: string,
  opportunityId: string,
  stageName: string,
): Promise<void> {
  try {
    const stage = await findStageByName(tenantId, stageName);
    if (!stage) {
      log.warn({ tenantId, opportunityId, stageName }, "Stage not found — cannot move opportunity");
      return;
    }

    const ghl = await getGHLClient(tenantId);
    await ghl.updateOpportunity(opportunityId, { stageId: stage.stageId });

    log.info({ tenantId, opportunityId, stageName, stageId: stage.stageId }, "Moved GHL opportunity stage");
  } catch (err) {
    log.error({ tenantId, opportunityId, stageName, error: err }, "Failed to move opportunity stage");
  }
}
