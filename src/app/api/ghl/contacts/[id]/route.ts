import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "contacts:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, contactId: id });

  try {
    const data = await getCachedOrFetch(
      CacheKeys.contact(tenantId, id),
      CacheTTL.contact,
      async () => {
        const client = await createGHLClient(tenantId);
        const res = await client.get(`/contacts/${id}`);
        return res.data;
      }
    );

    log.info("Contact fetched");
    return NextResponse.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch contact");
    return NextResponse.json(
      { error: "Failed to fetch contact", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
