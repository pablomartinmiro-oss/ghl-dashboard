import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { prisma } from "@/lib/db";
import { getDataMode } from "@/lib/data/getDataMode";
import { logger } from "@/lib/logger";
import type { GHLPipelinesResponse, GHLPipelineStage } from "@/lib/ghl/types";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/crm/pipelines" });

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      const pipelines = await prisma.cachedPipeline.findMany({
        where: { tenantId },
      });

      log.info({ count: pipelines.length, mode }, "Pipelines from cache");
      return NextResponse.json({
        pipelines: pipelines.map((p) => ({
          id: p.id,
          name: p.name,
          stages: p.stages as unknown as GHLPipelineStage[],
        })),
      });
    }

    // Mock mode
    const data = await getCachedOrFetch<GHLPipelinesResponse>(
      CacheKeys.pipelines(tenantId),
      CacheTTL.pipelines,
      async () => {
        const client = await createGHLClient(tenantId);
        const res = await client.get("/opportunities/pipelines");
        return res.data as GHLPipelinesResponse;
      }
    );

    log.info({ count: data.pipelines.length, mode }, "Pipelines fetched");
    return NextResponse.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch pipelines");
    return NextResponse.json(
      { error: "Failed to fetch pipelines", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
