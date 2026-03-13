import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import type { GHLNotesResponse } from "@/lib/ghl/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "contacts:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const { id } = await params;

  try {
    const client = await createGHLClient(tenantId);
    const res = await client.get(`/contacts/${id}/notes`);
    return NextResponse.json(res.data as GHLNotesResponse);
  } catch (error) {
    logger.error({ tenantId, contactId: id, error }, "Failed to fetch notes");
    return NextResponse.json(
      { error: "Failed to fetch notes", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions as PermissionKey[];
  if (!hasPermission(permissions, "contacts:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const body = await req.json();

  try {
    const client = await createGHLClient(tenantId);
    const res = await client.post(`/contacts/${id}/notes`, {
      body: body.body,
      userId: session.user.id,
    });
    return NextResponse.json(res.data);
  } catch (error) {
    logger.error({ tenantId, contactId: id, error }, "Failed to add note");
    return NextResponse.json(
      { error: "Failed to add note", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
