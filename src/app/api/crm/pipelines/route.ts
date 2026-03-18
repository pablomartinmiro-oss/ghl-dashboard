import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { GHLPipelineStage } from "@/lib/ghl/types";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/crm/pipelines" });

  try {
    const pipelines = await prisma.cachedPipeline.findMany({
      where: { tenantId },
    });

    log.info({ count: pipelines.length }, "Pipelines from cache");
    return NextResponse.json({
      pipelines: pipelines.map((p) => ({
        id: p.id,
        name: p.name,
        stages: p.stages as unknown as GHLPipelineStage[],
      })),
    });
  } catch (error) {
    log.error({ error }, "Failed to fetch pipelines");
    return NextResponse.json(
      { error: "Failed to fetch pipelines", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
