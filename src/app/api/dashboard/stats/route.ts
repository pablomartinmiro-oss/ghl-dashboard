import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Check if GHL is connected
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { ghlAccessToken: true, syncState: true, lastSyncError: true },
  });
  const ghlConnected = !!tenant?.ghlAccessToken;

  const [
    totalContacts,
    pipelineValueResult,
    activeConversations,
    recentContacts,
    recentOpportunities,
    syncStatus,
    pipelineCount,
  ] = await Promise.all([
    prisma.cachedContact.count({ where: { tenantId } }),
    prisma.cachedOpportunity.aggregate({
      where: { tenantId, status: "open" },
      _sum: { monetaryValue: true },
    }),
    prisma.cachedConversation.count({
      where: { tenantId, lastMessageDate: { gte: sevenDaysAgo } },
    }),
    prisma.cachedContact.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, source: true, updatedAt: true },
    }),
    prisma.cachedOpportunity.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, monetaryValue: true, status: true, updatedAt: true },
    }),
    prisma.syncStatus.findUnique({ where: { tenantId } }),
    prisma.cachedPipeline.count({ where: { tenantId } }),
  ]);

  return NextResponse.json({
    ghlConnected,
    ghlError: tenant?.syncState === "error" ? tenant.lastSyncError : null,
    stats: {
      totalContacts,
      pipelineValue: pipelineValueResult._sum.monetaryValue ?? 0,
      activeConversations,
      pipelineCount,
      recentContacts,
      recentOpportunities,
      lastSync: syncStatus?.lastFullSync ?? syncStatus?.lastIncrSync,
      syncInProgress: syncStatus?.syncInProgress ?? false,
    },
  });
}
