/**
 * Create a GHL opportunity in the matching pipeline when a survey quote is generated.
 * Silently returns null if GHL isn't connected or the pipeline isn't cached.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getGHLClient } from "@/lib/ghl/api";

const log = logger.child({ module: "survey:opportunity" });

// Map normalised destination slug → GHL pipeline name (case-insensitive search)
const PIPELINE_MAP: Record<string, string> = {
  baqueira: "BAQUEIRA BERET",
  grandvalira: "BAQUEIRA BERET",
  sierra_nevada: "SIERRA NEVADA",
  alto_campoo: "ALTO CAMPOO",
  formigal: "FORMIGAL",
  candanchu: "CANDANCHU",
  la_pinilla: "PINILLA",
  sierra_de_madrid: "MADRID",
};

// Entry stage keywords by priority — whichever matches first wins
const ENTRY_STAGE_KEYWORDS = ["FORMULARIO", "LEAD", "NUEVO", "ENTRADA"];

function findEntryStage(stages: Array<{ id: string; name: string; position: number }>): { id: string; name: string; position: number } | undefined {
  for (const keyword of ENTRY_STAGE_KEYWORDS) {
    const match = stages.find((s) => s.name.toUpperCase().includes(keyword));
    if (match) return match;
  }
  // Fall back to lowest position (first stage)
  return stages.sort((a, b) => a.position - b.position)[0];
}

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

    // Find pipeline by partial name match (handles accent encoding differences in GHL)
    const cached = await prisma.cachedPipeline.findFirst({
      where: { tenantId, name: { contains: pipelineName, mode: "insensitive" } },
    });

    if (!cached) {
      log.warn({ tenantId, pipelineName }, "Pipeline not found in cache — skipping opportunity");
      return null;
    }

    const stages = cached.stages as Array<{ id: string; name: string; position: number }>;
    const stage = findEntryStage(stages);
    if (!stage) return null;

    log.info({ tenantId, pipelineName: cached.name, stageName: stage.name }, "Pipeline + stage resolved for opportunity");

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
