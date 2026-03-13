import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import type { GHLMessagesResponse } from "@/lib/ghl/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "comms:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, conversationId: id });

  try {
    const data = await getCachedOrFetch<GHLMessagesResponse>(
      CacheKeys.conversation(tenantId, id),
      CacheTTL.conversation,
      async () => {
        const client = await createGHLClient(tenantId);
        const res = await client.get(`/conversations/${id}/messages`);
        return res.data as GHLMessagesResponse;
      }
    );

    log.info({ count: data.messages.length }, "Messages fetched");
    return NextResponse.json(data);
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

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "comms:send")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const body = await req.json();
  const log = logger.child({ tenantId, conversationId: id });

  try {
    const client = await createGHLClient(tenantId);
    const res = await client.post("/conversations/messages", {
      type: "SMS",
      conversationId: id,
      message: body.message,
    });

    log.info("Message sent");
    return NextResponse.json(res.data);
  } catch (error) {
    log.error({ error }, "Failed to send message");
    return NextResponse.json(
      { error: "Failed to send message", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
