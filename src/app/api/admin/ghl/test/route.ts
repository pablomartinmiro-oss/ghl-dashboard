import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasPermission } from "@/lib/auth/permissions";
import { testConnection } from "@/lib/ghl/api";
import { logger } from "@/lib/logger";
import type { PermissionKey } from "@/types/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.permissions as PermissionKey[], "settings:tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const log = logger.child({ tenantId: session.user.tenantId, path: "/api/admin/ghl/test" });

  try {
    const result = await testConnection(session.user.tenantId);
    log.info("GHL connection test passed");
    return NextResponse.json({ ok: true, location: result.location });
  } catch (error) {
    log.error({ error }, "GHL connection test failed");
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Connection failed" },
      { status: 500 }
    );
  }
}
