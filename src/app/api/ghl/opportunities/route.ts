import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import type { GHLOpportunitiesResponse } from "@/lib/ghl/types";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "pipelines:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const url = new URL(req.url);
  const pipelineId = url.searchParams.get("pipelineId") ?? "";
  const log = logger.child({ tenantId, path: "/api/ghl/opportunities" });

  try {
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

    log.info({ count: data.opportunities.length }, "Opportunities fetched");
    return NextResponse.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch opportunities");
    return NextResponse.json(
      { error: "Failed to fetch opportunities", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
