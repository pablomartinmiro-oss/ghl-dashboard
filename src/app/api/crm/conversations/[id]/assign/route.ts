import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getDataMode } from "@/lib/data/getDataMode";
import { getGHLClient } from "@/lib/ghl/api";
import { logger } from "@/lib/logger";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const body = await req.json();
  const { assignedTo } = body as { assignedTo: string | null };
  const log = logger.child({ tenantId, conversationId: id });

  try {
    const mode = await getDataMode(tenantId);
    if (mode === "disconnected") {
      return NextResponse.json({ error: "GHL no conectado" }, { status: 400 });
    }

    const ghl = await getGHLClient(tenantId);
    await ghl.updateConversation(id, { assignedTo: assignedTo ?? undefined });
    log.info({ assignedTo }, "Conversation assigned via GHL");

    return NextResponse.json({ success: true, assignedTo });
  } catch (error) {
    log.error({ error }, "Failed to assign conversation");
    return NextResponse.json({ error: "Failed to assign conversation" }, { status: 500 });
  }
}
