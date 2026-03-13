import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import type { GHLPipelinesResponse } from "@/lib/ghl/types";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "pipelines:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/ghl/pipelines" });

  try {
    const data = await getCachedOrFetch<GHLPipelinesResponse>(
      CacheKeys.pipelines(tenantId),
      CacheTTL.pipelines,
      async () => {
        const client = await createGHLClient(tenantId);
        const res = await client.get("/opportunities/pipelines");
        return res.data as GHLPipelinesResponse;
      }
    );

    log.info({ count: data.pipelines.length }, "Pipelines fetched");
    return NextResponse.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch pipelines");
    return NextResponse.json(
      { error: "Failed to fetch pipelines", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
