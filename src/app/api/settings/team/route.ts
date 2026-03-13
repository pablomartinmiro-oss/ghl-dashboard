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
  if (!hasPermission(permissions, "settings:team")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/settings/team" });

  try {
    const [users, roles] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.role.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          isSystem: true,
          permissions: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    log.info({ userCount: users.length }, "Team data fetched");
    return NextResponse.json({ users, roles });
  } catch (error) {
    log.error({ error }, "Failed to fetch team data");
    return NextResponse.json(
      { error: "Failed to fetch team", code: "TEAM_ERROR" },
      { status: 500 }
    );
  }
}
