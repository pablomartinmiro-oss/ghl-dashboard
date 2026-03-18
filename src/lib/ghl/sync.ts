import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getGHLClient, type GHLClient } from "./api";
import { logger } from "@/lib/logger";
import type { GHLContact, GHLConversation, GHLOpportunity, GHLPipeline } from "./types";

type JsonValue = Prisma.InputJsonValue;

/** Strip id from a cache record for use in Prisma update */
function stripId<T extends { id: string }>(data: T): Omit<T, "id"> {
  const { id: _, ...rest } = data;
  return rest;
}

const log = logger.child({ layer: "ghl-sync" });

// ==================== MAPPER FUNCTIONS ====================

export function mapContactToCache(tenantId: string, contact: GHLContact) {
  return {
    id: contact.id,
    tenantId,
    firstName: contact.firstName ?? null,
    lastName: contact.lastName ?? null,
    name: contact.name ?? (`${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || null),
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    tags: (contact.tags ?? []) as JsonValue,
    customFields: (contact.customFields ?? {}) as JsonValue,
    source: contact.source ?? null,
    dateAdded: contact.dateAdded ? new Date(contact.dateAdded) : null,
    lastActivity: contact.lastActivity ? new Date(contact.lastActivity) : null,
    dnd: contact.dnd ?? false,
    raw: JSON.parse(JSON.stringify(contact)) as JsonValue,
    cachedAt: new Date(),
  };
}

export function mapConversationToCache(tenantId: string, conv: GHLConversation) {
  return {
    id: conv.id,
    tenantId,
    contactId: conv.contactId,
    contactName: conv.contactName ?? null,
    contactPhone: conv.contactPhone ?? null,
    contactEmail: conv.contactEmail ?? null,
    lastMessageBody: conv.lastMessageBody ?? null,
    lastMessageDate: conv.lastMessageDate ? new Date(conv.lastMessageDate) : null,
    lastMessageType: conv.lastMessageType ?? conv.type ?? null,
    unreadCount: conv.unreadCount ?? 0,
    raw: JSON.parse(JSON.stringify(conv)) as JsonValue,
    cachedAt: new Date(),
  };
}

export function mapOpportunityToCache(tenantId: string, opp: GHLOpportunity) {
  return {
    id: opp.id,
    tenantId,
    pipelineId: opp.pipelineId,
    pipelineStageId: opp.pipelineStageId,
    name: opp.name ?? null,
    contactId: opp.contactId ?? null,
    contactName: opp.contactName ?? null,
    monetaryValue: opp.monetaryValue ?? null,
    status: opp.status ?? null,
    assignedTo: opp.assignedTo ?? null,
    lastActivity: opp.lastActivity ? new Date(opp.lastActivity) : null,
    raw: JSON.parse(JSON.stringify(opp)) as JsonValue,
    cachedAt: new Date(),
  };
}

export function mapPipelineToCache(tenantId: string, pipeline: GHLPipeline) {
  return {
    id: pipeline.id,
    tenantId,
    name: pipeline.name,
    stages: JSON.parse(JSON.stringify(pipeline.stages)) as JsonValue,
    raw: JSON.parse(JSON.stringify(pipeline)) as JsonValue,
    cachedAt: new Date(),
  };
}

// ==================== FULL SYNC ====================

export interface SyncProgress {
  contacts: number;
  contactsTotal?: number;
  conversations: number;
  opportunities: number;
  pipelines: number;
  status: "in_progress" | "completed" | "failed";
  error?: string;
}

export async function fullSync(
  tenantId: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncProgress> {
  const progress: SyncProgress = {
    contacts: 0,
    conversations: 0,
    opportunities: 0,
    pipelines: 0,
    status: "in_progress",
  };

  // Mark sync in progress
  await prisma.syncStatus.upsert({
    where: { tenantId },
    create: { tenantId, syncInProgress: true },
    update: { syncInProgress: true, lastError: null },
  });
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { syncState: "syncing", syncProgressMsg: "Iniciando sincronización...", lastSyncError: null },
  });

  try {
    log.info({ tenantId }, "Creating GHL client...");
    const ghl = await getGHLClient(tenantId);
    log.info({ tenantId, locationId: ghl.getLocationId() }, "GHL client created OK");

    // 1. Sync pipelines and stages
    log.info({ tenantId }, "Syncing pipelines...");
    let pipelines;
    try {
      pipelines = await ghl.getPipelines();
      log.info({ tenantId, count: pipelines.length, names: pipelines.map(p => p.name) }, "Pipelines fetched OK");
    } catch (pipelineError) {
      const axErr = pipelineError as { response?: { status?: number; data?: unknown }; message?: string };
      log.error({
        tenantId,
        status: axErr.response?.status,
        body: JSON.stringify(axErr.response?.data ?? "").substring(0, 500),
        message: axErr.message,
      }, "PIPELINE FETCH FAILED");
      throw pipelineError;
    }
    for (const pipeline of pipelines) {
      const data = mapPipelineToCache(tenantId, pipeline);
      await prisma.cachedPipeline.upsert({
        where: { id: pipeline.id },
        create: data,
        update: { name: data.name, stages: data.stages, raw: data.raw, cachedAt: new Date() },
      });
      progress.pipelines++;

      // 2. Sync opportunities per pipeline (paginated)
      await syncOpportunitiesForPipeline(ghl, tenantId, pipeline.id, progress);
    }
    onProgress?.(progress);

    // 3. Sync contacts (paginated — GHL max 100 per page)
    log.info({ tenantId }, "Syncing contacts...");
    await syncAllContacts(ghl, tenantId, progress, onProgress);

    // 4. Sync recent conversations
    log.info({ tenantId }, "Syncing conversations...");
    await syncConversations(ghl, tenantId, progress);
    onProgress?.(progress);

    // Update sync status
    progress.status = "completed";
    await prisma.syncStatus.update({
      where: { tenantId },
      data: {
        lastFullSync: new Date(),
        contactCount: progress.contacts,
        conversationCount: progress.conversations,
        opportunityCount: progress.opportunities,
        pipelineCount: progress.pipelines,
        syncInProgress: false,
      },
    });
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        syncState: "complete",
        syncProgressMsg: `${progress.contacts} contactos, ${progress.conversations} conversaciones, ${progress.opportunities} oportunidades`,
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });

    log.info(
      { tenantId, ...progress },
      "Full sync completed"
    );
    return progress;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    const axErr = error as { response?: { status?: number; data?: unknown } };
    progress.status = "failed";
    progress.error = msg;

    log.error({
      tenantId,
      error: msg,
      stack,
      httpStatus: axErr.response?.status,
      httpBody: JSON.stringify(axErr.response?.data ?? "").substring(0, 500),
      progress,
    }, "FULL SYNC FAILED — detailed error");

    await prisma.syncStatus.update({
      where: { tenantId },
      data: { syncInProgress: false, lastError: msg },
    });
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { syncState: "error", lastSyncError: msg },
    });
    return progress;
  }
}

async function syncAllContacts(
  ghl: GHLClient,
  tenantId: string,
  progress: SyncProgress,
  onProgress?: (progress: SyncProgress) => void
) {
  let startAfterId: string | undefined;
  let startAfter: number | undefined;
  let hasMore = true;
  const batchSize = 100;

  while (hasMore) {
    let res;
    try {
      res = await ghl.getContacts({
        limit: batchSize,
        startAfterId,
        startAfter,
      });
    } catch (contactError) {
      const axErr = contactError as { response?: { status?: number; data?: unknown }; message?: string };
      log.error({
        tenantId,
        page: progress.contacts,
        status: axErr.response?.status,
        body: JSON.stringify(axErr.response?.data ?? "").substring(0, 500),
        message: axErr.message,
        startAfterId,
        startAfter,
      }, "CONTACTS FETCH FAILED");
      throw contactError;
    }

    if (!res.contacts || res.contacts.length === 0) {
      log.info({ tenantId, totalSynced: progress.contacts }, "No more contacts");
      hasMore = false;
      break;
    }

    progress.contactsTotal = res.meta?.total;
    log.info({
      tenantId,
      batch: res.contacts.length,
      total: res.meta?.total,
      synced: progress.contacts,
    }, "Contacts batch received");

    // Batch upsert contacts
    for (const contact of res.contacts) {
      const data = mapContactToCache(tenantId, contact);
      await prisma.cachedContact.upsert({
        where: { id: contact.id },
        create: data,
        update: stripId(data),
      });
      progress.contacts++;
    }

    onProgress?.(progress);

    // Update tenant sync progress for UI polling
    const totalLabel = progress.contactsTotal ? `/${progress.contactsTotal}` : "";
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { syncProgressMsg: `Contactos: ${progress.contacts}${totalLabel}` },
    });

    // GHL pagination uses startAfterId or startAfter
    if (res.meta?.startAfterId) {
      startAfterId = res.meta.startAfterId;
    } else if (res.meta?.startAfter !== undefined) {
      startAfter = res.meta.startAfter;
    } else {
      // Fallback: use last contact ID
      startAfterId = res.contacts[res.contacts.length - 1].id;
    }

    hasMore = res.contacts.length === batchSize;

    // Rate limit: wait 150ms between pages
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function syncOpportunitiesForPipeline(
  ghl: GHLClient,
  tenantId: string,
  pipelineId: string,
  progress: SyncProgress
) {
  let startAfterId: string | undefined;
  let hasMore = true;

  while (hasMore) {
    let res;
    try {
      res = await ghl.getOpportunities(pipelineId, {
        limit: 20,
        startAfterId,
      });
    } catch (oppError) {
      const axErr = oppError as { response?: { status?: number; data?: unknown }; message?: string };
      log.error({
        tenantId,
        pipelineId,
        status: axErr.response?.status,
        body: JSON.stringify(axErr.response?.data ?? "").substring(0, 500),
        message: axErr.message,
      }, "OPPORTUNITIES FETCH FAILED");
      throw oppError;
    }

    if (!res.opportunities || res.opportunities.length === 0) {
      hasMore = false;
      break;
    }

    for (const opp of res.opportunities) {
      const data = mapOpportunityToCache(tenantId, opp);
      await prisma.cachedOpportunity.upsert({
        where: { id: opp.id },
        create: data,
        update: stripId(data),
      });
      progress.opportunities++;
    }

    if (res.meta?.nextPage) {
      startAfterId = res.opportunities[res.opportunities.length - 1].id;
    } else {
      hasMore = false;
    }

    await new Promise((r) => setTimeout(r, 150));
  }
}

async function syncConversations(
  ghl: GHLClient,
  tenantId: string,
  progress: SyncProgress
) {
  let hasMore = true;
  let lastMessageDate: string | undefined;
  const batchSize = 100;

  while (hasMore) {
    const res = await ghl.getConversations({ limit: batchSize });

    if (!res.conversations || res.conversations.length === 0) {
      hasMore = false;
      break;
    }

    for (const conv of res.conversations) {
      const data = mapConversationToCache(tenantId, conv);
      await prisma.cachedConversation.upsert({
        where: { id: conv.id },
        create: data,
        update: stripId(data),
      });
      progress.conversations++;
      lastMessageDate = conv.lastMessageDate ?? lastMessageDate;
    }

    // GHL conversations search doesn't support cursor pagination well —
    // stop after first batch to avoid duplicates (webhooks keep it fresh)
    hasMore = false;

    await new Promise((r) => setTimeout(r, 150));
  }
}

// ==================== INCREMENTAL SYNC ====================

export async function incrementalSync(tenantId: string): Promise<{
  contactsDelta: number;
  needsFullSync: boolean;
}> {
  const ghl = await getGHLClient(tenantId);

  // Get current cache count
  const cachedCount = await prisma.cachedContact.count({ where: { tenantId } });

  // Get GHL total count (first page with limit=1 to get meta.total)
  const res = await ghl.getContacts({ limit: 1 });
  const ghlTotal = res.meta?.total ?? 0;

  const delta = Math.abs(ghlTotal - cachedCount);
  const mismatchPercent = cachedCount > 0 ? (delta / cachedCount) * 100 : 100;

  log.info(
    { tenantId, cachedCount, ghlTotal, delta, mismatchPercent },
    "Incremental sync check"
  );

  // If mismatch > 10%, need full sync
  if (mismatchPercent > 10) {
    return { contactsDelta: delta, needsFullSync: true };
  }

  // Otherwise sync recent contacts (last 10 minutes)
  // GHL doesn't have a "modified since" filter, so we just re-fetch recent
  const recentContacts = await ghl.getContacts({ limit: 100 });
  for (const contact of recentContacts.contacts) {
    const data = mapContactToCache(tenantId, contact);
    await prisma.cachedContact.upsert({
      where: { id: contact.id },
      create: data,
      update: stripId(data),
    });
  }

  // Update sync status
  await prisma.syncStatus.upsert({
    where: { tenantId },
    create: { tenantId, lastIncrSync: new Date() },
    update: { lastIncrSync: new Date() },
  });

  return { contactsDelta: delta, needsFullSync: false };
}

// ==================== WEBHOOK CACHE HANDLERS ====================

export async function upsertCachedContact(
  tenantId: string,
  // GHL raw response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
) {
  const contactData = {
    id: data.id as string,
    tenantId,
    firstName: (data.firstName as string) ?? null,
    lastName: (data.lastName as string) ?? null,
    name: (data.name as string) ??
      (`${(data.firstName as string) ?? ""} ${(data.lastName as string) ?? ""}`.trim() || null),
    email: (data.email as string) ?? null,
    phone: (data.phone as string) ?? null,
    tags: (data.tags ?? []) as JsonValue,
    customFields: (data.customFields ?? {}) as JsonValue,
    source: (data.source as string) ?? null,
    dateAdded: data.dateAdded ? new Date(data.dateAdded as string) : null,
    lastActivity: data.lastActivity ? new Date(data.lastActivity as string) : null,
    dnd: (data.dnd as boolean) ?? false,
    raw: JSON.parse(JSON.stringify(data)) as JsonValue,
    cachedAt: new Date(),
  };

  await prisma.cachedContact.upsert({
    where: { id: contactData.id },
    create: contactData,
    update: stripId(contactData),
  });
}

export async function deleteCachedContact(tenantId: string, contactId: string) {
  await prisma.cachedContact.deleteMany({
    where: { id: contactId, tenantId },
  });
}

export async function updateCachedContactTags(
  tenantId: string,
  // GHL raw response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
) {
  const contactId = data.id as string ?? data.contactId as string;
  if (!contactId) return;

  await prisma.cachedContact.updateMany({
    where: { id: contactId, tenantId },
    data: { tags: (data.tags ?? []) as JsonValue, cachedAt: new Date() },
  });
}

export async function updateCachedContactDnd(
  tenantId: string,
  // GHL raw response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
) {
  const contactId = data.id as string ?? data.contactId as string;
  if (!contactId) return;

  await prisma.cachedContact.updateMany({
    where: { id: contactId, tenantId },
    data: { dnd: (data.dnd as boolean) ?? false, cachedAt: new Date() },
  });
}

export async function cacheMessage(
  tenantId: string,
  // GHL raw response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
) {
  const conversationId = data.conversationId as string;
  if (!conversationId) return;

  // Update conversation's last message
  await prisma.cachedConversation.updateMany({
    where: { id: conversationId, tenantId },
    data: {
      lastMessageBody: (data.body as string) ?? null,
      lastMessageDate: data.dateAdded ? new Date(data.dateAdded as string) : new Date(),
      lastMessageType: (data.messageType as string) ?? null,
      cachedAt: new Date(),
    },
  });
}

export async function upsertCachedOpportunity(
  tenantId: string,
  // GHL raw response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
) {
  const oppData = {
    id: data.id as string,
    tenantId,
    pipelineId: data.pipelineId as string,
    pipelineStageId: data.pipelineStageId as string,
    name: (data.name as string) ?? null,
    contactId: (data.contactId as string) ?? null,
    contactName: (data.contact?.name as string) ?? null,
    monetaryValue: (data.monetaryValue as number) ?? null,
    status: (data.status as string) ?? null,
    assignedTo: (data.assignedTo as string) ?? null,
    lastActivity: data.lastActivity ? new Date(data.lastActivity as string) : null,
    raw: data,
    cachedAt: new Date(),
  };

  await prisma.cachedOpportunity.upsert({
    where: { id: oppData.id },
    create: oppData,
    update: { ...oppData, id: undefined },
  });
}

export async function updateCachedOpportunityField(
  tenantId: string,
  // GHL raw response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
) {
  const oppId = data.id as string;
  if (!oppId) return;

  // Build update with only provided fields
  // GHL raw response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { cachedAt: new Date() };
  if (data.pipelineStageId) update.pipelineStageId = data.pipelineStageId;
  if (data.status) update.status = data.status;
  if (data.monetaryValue !== undefined) update.monetaryValue = data.monetaryValue;

  await prisma.cachedOpportunity.updateMany({
    where: { id: oppId, tenantId },
    data: update,
  });
}

// ==================== SYNC QUEUE PROCESSOR ====================

export async function processSyncQueue() {
  const items = await prisma.syncQueue.findMany({
    where: {
      status: "pending",
      nextRetryAt: { lte: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  for (const item of items) {
    try {
      await prisma.syncQueue.update({
        where: { id: item.id },
        data: { status: "processing", attempts: item.attempts + 1 },
      });

      const ghl = await getGHLClient(item.tenantId);
      const payload = item.payload as Record<string, unknown>;

      switch (item.action) {
        case "updateContact":
          await ghl.updateContact(item.resourceId, payload);
          break;
        case "createContact":
          await ghl.createContact(payload);
          break;
        case "updateOpportunity":
          await ghl.updateOpportunity(item.resourceId, payload);
          break;
        case "createOpportunity":
          await ghl.createOpportunity(payload as unknown as Parameters<GHLClient["createOpportunity"]>[0]);
          break;
        default:
          log.warn({ action: item.action }, "Unknown sync queue action");
      }

      await prisma.syncQueue.update({
        where: { id: item.id },
        data: { status: "completed" },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      const nextRetry = new Date(Date.now() + Math.pow(2, item.attempts) * 60000);

      await prisma.syncQueue.update({
        where: { id: item.id },
        data: {
          status: item.attempts + 1 >= item.maxAttempts ? "failed" : "pending",
          lastError: msg,
          nextRetryAt: nextRetry,
        },
      });

      log.error(
        { itemId: item.id, action: item.action, error: msg },
        "Sync queue item failed"
      );
    }
  }
}
