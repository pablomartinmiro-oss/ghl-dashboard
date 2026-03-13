import { NextResponse } from "next/server";
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
