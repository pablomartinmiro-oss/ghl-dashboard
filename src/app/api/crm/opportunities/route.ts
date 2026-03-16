import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { prisma } from "@/lib/db";
import { getDataMode } from "@/lib/data/getDataMode";
import { logger } from "@/lib/logger";
import type { GHLOpportunitiesResponse } from "@/lib/ghl/types";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const url = new URL(req.url);
  const pipelineId = url.searchParams.get("pipelineId") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "100")));
  const skip = (page - 1) * limit;
  const log = logger.child({ tenantId, path: "/api/crm/opportunities" });

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      const where = { tenantId, ...(pipelineId ? { pipelineId } : {}) };
      const [opportunities, total] = await Promise.all([
        prisma.cachedOpportunity.findMany({
          where,
          orderBy: { cachedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.cachedOpportunity.count({ where }),
      ]);

      log.info({ count: opportunities.length, mode, page }, "Opportunities from cache");
      return NextResponse.json({
        opportunities: opportunities.map((o) => ({
          id: o.id,
          name: o.name ?? "",
          pipelineId: o.pipelineId,
          pipelineStageId: o.pipelineStageId,
          monetaryValue: o.monetaryValue ?? 0,
          contactId: o.contactId ?? "",
          contactName: o.contactName,
          assignedTo: o.assignedTo,
          createdAt: o.cachedAt.toISOString(),
          status: o.status ?? "open",
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    // Mock mode
    const data = await getCachedOrFetch<GHLOpportunitiesResponse>(
      CacheKeys.opportunities(tenantId, pipelineId),
      CacheTTL.opportunities,
      async () => {
        const client = await createGHLClient(tenantId);
        const res = await client.get("/opportunities/search", {
          params: { pipeline_id: pipelineId },
        });
        return res.data as GHLOpportunitiesResponse;
      }
    );

    log.info({ count: data.opportunities.length, mode }, "Opportunities fetched");
    return NextResponse.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch opportunities");
    return NextResponse.json(
      { error: "Failed to fetch opportunities", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
