import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "groups:dashboard" });

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [groups, members] = await Promise.all([
      prisma.groupBooking.findMany({
        where: { tenantId },
        select: { status: true, type: true, estimatedSize: true, totalCents: true, startDate: true },
      }),
      prisma.groupMember.count({
        where: { group: { tenantId } },
      }),
    ]);

    const byStatus = groups.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = (acc[g.status] ?? 0) + 1;
      return acc;
    }, {});
    const byType = groups.reduce<Record<string, number>>((acc, g) => {
      acc[g.type] = (acc[g.type] ?? 0) + 1;
      return acc;
    }, {});

    const upcoming = groups.filter((g) => g.startDate >= today).length;
    const totalEstimatedPeople = groups.reduce((s, g) => s + g.estimatedSize, 0);
    const pipelineValueCents = groups
      .filter((g) => ["inquiry", "quoted", "confirmed"].includes(g.status))
      .reduce((s, g) => s + (g.totalCents ?? 0), 0);

    return NextResponse.json({
      totalGroups: groups.length,
      totalMembers: members,
      upcoming,
      totalEstimatedPeople,
      pipelineValueCents,
      byStatus,
      byType,
    });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to load groups dashboard");
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
