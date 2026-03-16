import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createGHLClient } from "@/lib/ghl/client";
import { getGHLClient } from "@/lib/ghl/api";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { prisma } from "@/lib/db";
import { getDataMode } from "@/lib/data/getDataMode";
import { mapContactToCache } from "@/lib/ghl/sync";
import { logger } from "@/lib/logger";

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
  const log = logger.child({ tenantId, contactId: id });

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      const cached = await prisma.cachedContact.findFirst({
        where: { id, tenantId },
      });

      if (cached) {
        return NextResponse.json({
          contact: {
            id: cached.id,
            firstName: cached.firstName ?? "",
            lastName: cached.lastName ?? "",
            name: cached.name ?? "",
            email: cached.email,
            phone: cached.phone,
            tags: cached.tags ?? [],
            source: cached.source,
            dateAdded: cached.dateAdded?.toISOString() ?? "",
            lastActivity: cached.lastActivity?.toISOString(),
            dnd: cached.dnd,
            customFields: cached.customFields ?? {},
          },
        });
      }
      // Fallback: fetch fresh from GHL
    }

    const data = await getCachedOrFetch(
      CacheKeys.contact(tenantId, id),
      CacheTTL.contact,
      async () => {
        const client = await createGHLClient(tenantId);
        const res = await client.get(`/contacts/${id}`);
        return res.data;
      }
    );

    log.info("Contact fetched");
    return NextResponse.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch contact");
    return NextResponse.json(
      { error: "Failed to fetch contact", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
  const log = logger.child({ tenantId, contactId: id });

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      const ghl = await getGHLClient(tenantId);
      const updated = await ghl.updateContact(id, body);

      // Update cache immediately
      const cacheData = mapContactToCache(tenantId, updated);
      const { id: _cacheId, ...updateData } = cacheData;
      await prisma.cachedContact.upsert({
        where: { id },
        create: cacheData,
        update: updateData,
      });

      log.info("Contact updated in GHL + cache");
      return NextResponse.json({ contact: updated });
    }

    const client = await createGHLClient(tenantId);
    const res = await client.put(`/contacts/${id}`, body);
    return NextResponse.json(res.data);
  } catch (error) {
    log.error({ error }, "Failed to update contact");

    // Queue for retry
    if (await getDataMode(tenantId) === "live") {
      await prisma.syncQueue.create({
        data: { tenantId, action: "updateContact", resourceId: id, payload: body },
      });
    }

    return NextResponse.json(
      { error: "Error al actualizar contacto", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, contactId: id });

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      const ghl = await getGHLClient(tenantId);
      await ghl.deleteContact(id);
      await prisma.cachedContact.deleteMany({ where: { id, tenantId } });
      log.info("Contact deleted from GHL + cache");
      return NextResponse.json({ success: true });
    }

    const client = await createGHLClient(tenantId);
    await client.delete(`/contacts/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Failed to delete contact");
    return NextResponse.json(
      { error: "Error al eliminar contacto", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
