import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { fullSync } from "@/lib/ghl/sync";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "/api/admin/ghl/full-sync" });

export async function POST() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;

  try {
    log.info({ tenantId }, "Starting full GHL sync");
    const result = await fullSync(tenantId);

    if (result.status === "failed") {
      return NextResponse.json(
        {
          error: "Error en sincronización",
          details: result.error,
          progress: result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Sincronización completa",
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error({ tenantId, error: msg }, "Full sync endpoint failed");
    return NextResponse.json(
      { error: "Error en sincronización", details: msg },
      { status: 500 }
    );
  }
}
