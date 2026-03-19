import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "notifications" });

/**
 * Creates a notification for all active Owner + Manager users of the tenant.
 * Fire-and-forget — never throws, always swallows errors.
 */
export async function createNotification(
  tenantId: string,
  type: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const recipients = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { name: { in: ["Owner", "Manager"] } },
      },
      select: { id: true },
    });

    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map((u) => ({
        tenantId,
        userId: u.id,
        type,
        title,
        body: body ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data ? (data as any) : null,
        isRead: false,
      })),
    });

    log.info({ tenantId, type, count: recipients.length }, "Notifications created");
  } catch (err) {
    log.warn({ error: err }, "Failed to create notification — skipping");
  }
}
