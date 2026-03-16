import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "settings:tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/settings/tenant" });

  try {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        ghlLocationId: true,
        ghlConnectedAt: true,
        ghlTokenExpiry: true,
        onboardingComplete: true,
        dataMode: true,
        isActive: true,
        createdAt: true,
      },
    });

    log.info("Tenant settings fetched");
    return NextResponse.json({ tenant });
  } catch (error) {
    log.error({ error }, "Failed to fetch tenant settings");
    return NextResponse.json(
      { error: "Failed to fetch settings", code: "SETTINGS_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "settings:tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/settings/tenant" });

  try {
    const body = await request.json();
    const { dataMode } = body as { dataMode?: string };

    if (dataMode !== undefined && dataMode !== "mock" && dataMode !== "live") {
      return NextResponse.json({ error: "dataMode must be 'mock' or 'live'" }, { status: 400 });
    }

    // If switching to live, check GHL is connected
    if (dataMode === "live") {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { ghlAccessToken: true },
      });
      if (!tenant?.ghlAccessToken) {
        return NextResponse.json({ error: "Conecta GoHighLevel antes de activar el modo real" }, { status: 400 });
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { ...(dataMode !== undefined ? { dataMode } : {}) },
      select: { id: true, dataMode: true },
    });

    log.info({ dataMode: updated.dataMode }, "Tenant settings updated");
    return NextResponse.json({ tenant: updated });
  } catch (error) {
    log.error({ error }, "Failed to update tenant settings");
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
