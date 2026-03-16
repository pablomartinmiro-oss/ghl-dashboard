import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const { userId } = await params;
  const log = logger.child({ tenantId, userId, path: `/api/settings/team/${userId}/role` });

  try {
    const body = await req.json();
    const { roleId } = body as { roleId: string };

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 }
      );
    }

    // Verify user belongs to same tenant
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify role belongs to same tenant
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        role: { select: { id: true, name: true } },
      },
    });

    log.info({ newRoleId: roleId, roleName: role.name }, "User role updated");
    return NextResponse.json({ user: updated });
  } catch (error) {
    log.error({ error }, "Failed to update user role");
    return NextResponse.json(
      { error: "Failed to update role", code: "TEAM_ERROR" },
      { status: 500 }
    );
  }
}
