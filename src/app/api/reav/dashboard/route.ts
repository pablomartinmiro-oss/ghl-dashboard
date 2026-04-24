import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const REQUIRED_DOC_TYPES = [
  "risk_assessment",
  "emergency_plan",
  "safety_protocol",
  "insurance_cert",
] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reav/dashboard" });

  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [registry, allDocs, openIncidents, criticalIncidents] = await Promise.all([
      prisma.rEAVRegistry.findUnique({ where: { tenantId } }),
      prisma.safetyDocument.findMany({
        where: { tenantId },
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          validUntil: true,
        },
      }),
      prisma.incidentReport.count({
        where: { tenantId, status: { in: ["open", "investigating"] } },
      }),
      prisma.incidentReport.count({
        where: {
          tenantId,
          severity: { in: ["serious", "critical"] },
          status: { in: ["open", "investigating"] },
        },
      }),
    ]);

    const activeDocsByType = new Set(
      allDocs.filter((d) => d.status === "active").map((d) => d.type)
    );
    const requiredCovered = REQUIRED_DOC_TYPES.filter((t) =>
      activeDocsByType.has(t)
    ).length;
    const missingRequired = REQUIRED_DOC_TYPES.filter(
      (t) => !activeDocsByType.has(t)
    );

    const expiringDocs = allDocs
      .filter(
        (d) =>
          d.status === "active" &&
          d.validUntil &&
          d.validUntil <= in30Days &&
          d.validUntil >= now
      )
      .map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        validUntil: d.validUntil,
        daysLeft: d.validUntil
          ? Math.ceil((d.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : null,
      }))
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

    const expiredDocs = allDocs.filter(
      (d) =>
        d.status === "active" && d.validUntil && d.validUntil < now
    ).length;

    const activeDocsCount = allDocs.filter((d) => d.status === "active").length;

    // Compliance score: required docs (60%) + active docs vs total (20%) + insurance (10%) + registry (10%)
    const requiredScore = (requiredCovered / REQUIRED_DOC_TYPES.length) * 60;
    const totalDocsScore =
      allDocs.length > 0 ? (activeDocsCount / allDocs.length) * 20 : 0;
    const insuranceScore =
      registry?.insuranceExpiry && registry.insuranceExpiry > now ? 10 : 0;
    const registryScore = registry?.status === "active" ? 10 : 0;
    const complianceScore = Math.round(
      requiredScore + totalDocsScore + insuranceScore + registryScore
    );

    // Registry expiry countdown
    const registryDaysLeft =
      registry?.expiresAt
        ? Math.ceil(
            (registry.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          )
        : null;

    const insuranceDaysLeft =
      registry?.insuranceExpiry
        ? Math.ceil(
            (registry.insuranceExpiry.getTime() - now.getTime()) /
              (24 * 60 * 60 * 1000)
          )
        : null;

    return NextResponse.json({
      dashboard: {
        complianceScore,
        registry,
        registryDaysLeft,
        insuranceDaysLeft,
        documents: {
          total: allDocs.length,
          active: activeDocsCount,
          expired: expiredDocs,
          expiring: expiringDocs,
        },
        required: {
          total: REQUIRED_DOC_TYPES.length,
          covered: requiredCovered,
          missing: missingRequired,
        },
        incidents: {
          open: openIncidents,
          critical: criticalIncidents,
        },
      },
    });
  } catch (error) {
    log.error({ error }, "Failed to compute REAV dashboard");
    return NextResponse.json({ error: "Failed to compute dashboard" }, { status: 500 });
  }
}
