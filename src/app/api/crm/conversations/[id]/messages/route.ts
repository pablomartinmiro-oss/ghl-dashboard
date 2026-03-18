import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getGHLClient } from "@/lib/ghl/api";
import { getDataMode } from "@/lib/data/getDataMode";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, conversationId: id });

  try {
    const mode = await getDataMode(tenantId);
    if (mode === "disconnected") {
      return NextResponse.json({ messages: [], nextPage: null });
    }

    // Messages always fetched fresh from GHL (not cached)
    const ghl = await getGHLClient(tenantId);
    const messages = await ghl.getMessages(id);
    log.info({ count: messages.length }, "Messages fetched live");
    return NextResponse.json({ messages, nextPage: null });
  } catch (error) {
    log.error({ error }, "Failed to fetch messages");
    return NextResponse.json(
      { error: "Failed to fetch messages", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(
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
  const log = logger.child({ tenantId, conversationId: id });

  try {
    const mode = await getDataMode(tenantId);
    if (mode === "disconnected") {
      return NextResponse.json({ error: "GHL no conectado" }, { status: 400 });
    }

    const ghl = await getGHLClient(tenantId);
    const result = await ghl.sendMessage({
      conversationId: id,
      type: (body.type as "SMS" | "Email" | "WhatsApp") ?? "SMS",
      body: body.message,
    });
    log.info("Message sent via GHL");
    return NextResponse.json(result);
  } catch (error) {
    log.error({ error }, "Failed to send message");
    return NextResponse.json(
      { error: "Failed to send message", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
