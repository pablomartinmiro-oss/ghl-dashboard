import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getGHLClient } from "@/lib/ghl/api";
import { prisma } from "@/lib/db";
import { getDataMode } from "@/lib/data/getDataMode";
import { logger } from "@/lib/logger";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const body = await req.json();
  const log = logger.child({ tenantId, opportunityId: id });

  try {
    const mode = await getDataMode(tenantId);
    if (mode === "disconnected") {
      return NextResponse.json({ error: "GHL no conectado" }, { status: 400 });
    }

    const ghl = await getGHLClient(tenantId);
    const updated = await ghl.updateOpportunity(id, body);

    // Update cache immediately
    await prisma.cachedOpportunity.updateMany({
      where: { id, tenantId },
      data: {
        ...(body.stageId ? { pipelineStageId: body.stageId } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.monetaryValue !== undefined ? { monetaryValue: body.monetaryValue } : {}),
        cachedAt: new Date(),
      },
    });

    log.info("Opportunity updated in GHL + cache");
    return NextResponse.json(updated);
  } catch (error) {
    log.error({ error }, "Failed to update opportunity");

    await prisma.syncQueue.create({
      data: { tenantId, action: "updateOpportunity", resourceId: id, payload: body },
    });

    return NextResponse.json(
      { error: "Error al actualizar oportunidad", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
