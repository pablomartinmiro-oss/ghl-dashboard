import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getGHLClient } from "@/lib/ghl/api";
import { prisma } from "@/lib/db";
import { getDataMode } from "@/lib/data/getDataMode";
import { mapContactToCache } from "@/lib/ghl/sync";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/crm/contacts" });
  const url = new URL(req.url);
  // Accept both ?search= (new) and ?query= (legacy)
  const query = url.searchParams.get("search") ?? url.searchParams.get("query") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");

  try {
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

    log.info({ count: contacts.length, total }, "Contacts from cache");
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
    if (mode === "disconnected") {
      return NextResponse.json({ error: "GHL no conectado" }, { status: 400 });
    }

    const ghl = await getGHLClient(tenantId);
    const created = await ghl.createContact(body);

    const cacheData = mapContactToCache(tenantId, created);
    const { id: _, ...updateData } = cacheData;
    await prisma.cachedContact.upsert({
      where: { id: created.id },
      create: cacheData,
      update: updateData,
    });

    log.info({ contactId: created.id }, "Contact created in GHL + cache");
    return NextResponse.json({ contact: created });
  } catch (error) {
    log.error({ error }, "Failed to create contact");

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
