import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getGHLClient } from "@/lib/ghl/api";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = logger.child({ tenantId: session.user.tenantId, path: "/api/admin/ghl/test" });

  try {
    const ghl = await getGHLClient(session.user.tenantId);
    const location = await ghl.getLocation();
    log.info("GHL connection test passed");
    return NextResponse.json({ ok: true, location });
  } catch (error) {
    log.error({ error }, "GHL connection test failed");
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Connection failed" },
      { status: 500 }
    );
  }
}
