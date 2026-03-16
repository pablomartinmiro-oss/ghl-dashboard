import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getGHLClient } from "@/lib/ghl/api";
import { getDataMode } from "@/lib/data/getDataMode";
import { logger } from "@/lib/logger";
import type { GHLNotesResponse } from "@/lib/ghl/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const { id } = await params;

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      const ghl = await getGHLClient(tenantId);
      const notes = await ghl.getContactNotes(id);
      return NextResponse.json({ notes });
    }

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

  const { tenantId } = session.user;
  const { id } = await params;
  const body = await req.json();

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      const ghl = await getGHLClient(tenantId);
      const note = await ghl.addContactNote(id, body.body);
      return NextResponse.json(note);
    }

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
