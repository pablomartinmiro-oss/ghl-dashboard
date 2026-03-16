import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasPermission } from "@/lib/auth/permissions";
import { getContacts } from "@/lib/ghl/api";
import { logger } from "@/lib/logger";
import type { PermissionKey } from "@/types/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.permissions as PermissionKey[], "settings:tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/admin/ghl/sync-contacts" });

  try {
    let offset = 0;
    const limit = 100;
    let totalSynced = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await getContacts(tenantId, { limit, offset });
      const contacts = result.contacts;

      if (!contacts || contacts.length === 0) {
        hasMore = false;
        break;
      }

      totalSynced += contacts.length;
      offset += limit;
      hasMore = contacts.length === limit;

      log.info({ batch: offset / limit, count: contacts.length }, "Contacts batch synced");
    }

    log.info({ totalSynced }, "Contact sync complete");
    return NextResponse.json({ ok: true, totalSynced });
  } catch (error) {
    log.error({ error }, "Contact sync failed");
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
