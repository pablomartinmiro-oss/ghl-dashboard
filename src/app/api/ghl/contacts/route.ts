import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import type { GHLContactsResponse } from "@/lib/ghl/types";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "contacts:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/ghl/contacts" });

  try {
    const data = await getCachedOrFetch<GHLContactsResponse>(
      CacheKeys.contacts(tenantId),
      CacheTTL.contacts,
      async () => {
        const client = await createGHLClient(tenantId);
        const res = await client.get("/contacts/");
        return res.data as GHLContactsResponse;
      }
    );

    log.info({ count: data.contacts.length }, "Contacts fetched");
    return NextResponse.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch contacts");
    return NextResponse.json(
      { error: "Failed to fetch contacts", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
