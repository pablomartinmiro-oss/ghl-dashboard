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
import type { GHLContactsResponse } from "@/lib/ghl/types";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/crm/contacts" });
  const url = new URL(req.url);
  const query = url.searchParams.get("query") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      // Read from local cache DB (fast)
      const where = {
        tenantId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { email: { contains: query, mode: "insensitive" as const } },
                { phone: { contains: query } },
              ],
            }
          : {}),
      };

      const [contacts, total] = await Promise.all([
        prisma.cachedContact.findMany({
          where,
          orderBy: { dateAdded: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.cachedContact.count({ where }),
      ]);

      log.info({ count: contacts.length, total, mode }, "Contacts from cache");
      return NextResponse.json({
        contacts: contacts.map((c) => ({
          id: c.id,
          firstName: c.firstName ?? "",
          lastName: c.lastName ?? "",
          name: c.name ?? "",
          email: c.email,
          phone: c.phone,
          tags: c.tags ?? [],
          source: c.source,
          dateAdded: c.dateAdded?.toISOString() ?? "",
          lastActivity: c.lastActivity?.toISOString(),
          dnd: c.dnd,
          customFields: c.customFields ?? {},
        })),
        meta: { total, currentPage: page, nextPage: page * limit < total ? page + 1 : null },
      });
    }

    // Mock mode: use GHL client (mock server)
    const data = await getCachedOrFetch<GHLContactsResponse>(
      CacheKeys.contacts(tenantId),
      CacheTTL.contacts,
      async () => {
        const client = await createGHLClient(tenantId);
        const res = await client.get("/contacts/");
        return res.data as GHLContactsResponse;
      }
    );

    log.info({ count: data.contacts.length, mode }, "Contacts fetched");
    return NextResponse.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch contacts");
    return NextResponse.json(
      { error: "Failed to fetch contacts", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const body = await req.json();
  const log = logger.child({ tenantId, path: "/api/crm/contacts" });

  try {
    const mode = await getDataMode(tenantId);

    if (mode === "live") {
      // Write to GHL (source of truth)
      const ghl = await getGHLClient(tenantId);
      const created = await ghl.createContact(body);

      // Update local cache immediately
      const cacheData = mapContactToCache(tenantId, created);
      const { id: _, ...updateData } = cacheData;
      await prisma.cachedContact.upsert({
        where: { id: created.id },
        create: cacheData,
        update: updateData,
      });

      log.info({ contactId: created.id }, "Contact created in GHL + cache");
      return NextResponse.json({ contact: created });
    }

    // Mock mode
    const client = await createGHLClient(tenantId);
    const res = await client.post("/contacts/", body);
    return NextResponse.json(res.data);
  } catch (error) {
    log.error({ error }, "Failed to create contact");

    // Queue for retry if GHL fails
    if (await getDataMode(tenantId) === "live") {
      await prisma.syncQueue.create({
        data: {
          tenantId,
          action: "createContact",
          resourceId: "new",
          payload: body,
        },
      });
    }

    return NextResponse.json(
      { error: "Error al crear contacto. Se reintentará automáticamente.", code: "GHL_ERROR" },
      { status: 500 }
    );
  }
}
