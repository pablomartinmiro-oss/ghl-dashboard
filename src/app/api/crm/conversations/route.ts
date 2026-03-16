import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { prisma } from "@/lib/db";
import { getDataMode } from "@/lib/data/getDataMode";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import type { GHLConversationsResponse } from "@/lib/ghl/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "comms:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/crm/conversations" });
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")));
  const skip = (page - 1) * limit;

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      const [conversations, total] = await Promise.all([
        prisma.cachedConversation.findMany({
          where: { tenantId },
          orderBy: { lastMessageDate: "desc" },
          skip,
          take: limit,
        }),
        prisma.cachedConversation.count({ where: { tenantId } }),
      ]);

      log.info({ count: conversations.length, mode, page }, "Conversations from cache");
      return NextResponse.json({
        conversations: conversations.map((c) => {
          const raw = c.raw as Record<string, unknown> | null;
          const assignedTo = (raw?.assignedTo as string) ?? null;
          return {
            id: c.id,
            contactId: c.contactId,
            contactName: c.contactName ?? "",
            contactPhone: c.contactPhone,
            contactEmail: c.contactEmail,
            lastMessageBody: c.lastMessageBody ?? "",
            lastMessageDate: c.lastMessageDate?.toISOString() ?? "",
            lastMessageType: c.lastMessageType,
            unreadCount: c.unreadCount,
            assignedTo,
            type: c.lastMessageType ?? "SMS",
          };
        }),
        total,
        meta: { page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    // Mock mode
    const data = await getCachedOrFetch<GHLConversationsResponse>(
      CacheKeys.conversations(tenantId),
      CacheTTL.conversations,
      async () => {
        const client = await createGHLClient(tenantId);
        const res = await client.get("/conversations/search");
        return res.data as GHLConversationsResponse;
      }
    );

    log.info({ count: data.conversations.length, mode }, "Conversations fetched");
    return NextResponse.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch conversations");
    return NextResponse.json(
      { error: "Failed to fetch conversations", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
