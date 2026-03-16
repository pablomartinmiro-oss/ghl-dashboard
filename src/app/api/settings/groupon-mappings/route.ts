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
  const log = logger.child({ tenantId, path: "/api/settings/groupon-mappings" });

  try {
    const mappings = await prisma.grouponProductMapping.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    log.info({ count: mappings.length }, "Groupon mappings fetched");
    return NextResponse.json({ mappings });
  } catch (error) {
    log.error({ error }, "Failed to fetch groupon mappings");
    return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "settings:tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/settings/groupon-mappings" });

  try {
    const body = await request.json();
    const { grouponDesc, pattern, services } = body as {
      grouponDesc?: string;
      pattern?: string;
      services?: Record<string, unknown>[];
    };

    if (!grouponDesc || !pattern || !services || !Array.isArray(services)) {
      return NextResponse.json(
        { error: "grouponDesc, pattern y services son obligatorios" },
        { status: 400 }
      );
    }

    // Validate regex pattern
    try {
      new RegExp(pattern, "i");
    } catch {
      return NextResponse.json({ error: "Patrón regex inválido" }, { status: 400 });
    }

    const mapping = await prisma.grouponProductMapping.create({
      data: {
        tenantId,
        grouponDesc,
        pattern,
        services: JSON.parse(JSON.stringify(services)),
      },
    });

    log.info({ mappingId: mapping.id }, "Groupon mapping created");
    return NextResponse.json({ mapping }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create groupon mapping");
    return NextResponse.json({ error: "Failed to create mapping" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "settings:tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/settings/groupon-mappings" });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.grouponProductMapping.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Mapeo no encontrado" }, { status: 404 });
    }

    await prisma.grouponProductMapping.delete({ where: { id } });

    log.info({ mappingId: id }, "Groupon mapping deleted");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Failed to delete groupon mapping");
    return NextResponse.json({ error: "Failed to delete mapping" }, { status: 500 });
  }
}
