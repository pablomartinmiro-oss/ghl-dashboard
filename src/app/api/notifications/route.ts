import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "notifications-api" });

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    log.error({ error: err }, "Failed to fetch notifications");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** Mark all as read */
export async function PATCH() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error({ error: err }, "Failed to mark notifications read");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
