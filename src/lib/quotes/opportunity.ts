/**
 * Create a GHL opportunity in the matching pipeline when a survey quote is generated.
 * Silently returns null if GHL isn't connected or the pipeline isn't cached.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getGHLClient } from "@/lib/ghl/api";

const log = logger.child({ module: "survey:opportunity" });

// Map normalised destination slug → GHL pipeline name
const PIPELINE_MAP: Record<string, string> = {
  baqueira: "BAQUEIRA BERET + ANDORRA",
  grandvalira: "BAQUEIRA BERET + ANDORRA",
  sierra_nevada: "SIERRA NEVADA",
  alto_campoo: "ALTO CAMPOO",
  formigal: "FORMIGAL",
  candanchu: "CANDANCHÚ",
  la_pinilla: "SIERRA DE MADRID + PINILLA + SNOWZONE",
  sierra_de_madrid: "SIERRA DE MADRID + PINILLA + SNOWZONE",
};

export interface OpportunityResult {
  opportunityId: string;
  pipelineId: string;
  stageId: string;
}

export async function createSurveyOpportunity(
  tenantId: string,
  contactId: string,
  destination: string,
  clientName: string,
  totalAmount: number
): Promise<OpportunityResult | null> {
  const pipelineName = PIPELINE_MAP[destination];
  if (!pipelineName) return null;

  try {
    const ghl = await getGHLClient(tenantId);

    // Find pipeline in cache — exact name, case-insensitive
    const cached = await prisma.cachedPipeline.findFirst({
      where: { tenantId, name: { equals: pipelineName, mode: "insensitive" } },
    });

    if (!cached) {
      log.warn({ tenantId, pipelineName }, "Pipeline not found in cache — skipping opportunity");
      return null;
    }

    const stages = cached.stages as Array<{ id: string; name: string; position: number }>;
    // Find "LEAD NO CONTESTADO" or fall back to first stage
    const stage =
      stages.find((s) => s.name.toUpperCase().includes("LEAD")) ?? stages[0];
    if (!stage) return null;

    const opp = await ghl.createOpportunity({
      pipelineId: cached.id,
      pipelineStageId: stage.id,
      name: `${clientName} — ${pipelineName}`,
      contactId,
      monetaryValue: totalAmount,
      status: "open",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawOpp = opp as any;
    await prisma.cachedOpportunity.upsert({
      where: { id: opp.id },
      create: {
        id: opp.id,
        tenantId,
        pipelineId: cached.id,
        pipelineStageId: stage.id,
        name: opp.name,
        contactId,
        monetaryValue: totalAmount,
        status: "open",
        raw: rawOpp,
      },
      update: {
        pipelineId: cached.id,
        pipelineStageId: stage.id,
        name: opp.name,
        monetaryValue: totalAmount,
        status: "open",
        raw: rawOpp,
      },
    });

    log.info({ tenantId, opportunityId: opp.id, pipelineId: cached.id }, "GHL opportunity created from survey");
    return { opportunityId: opp.id, pipelineId: cached.id, stageId: stage.id };
  } catch (err) {
    log.warn({ tenantId, destination, error: err }, "Could not create GHL opportunity (skipped)");
    return null;
  }
}
