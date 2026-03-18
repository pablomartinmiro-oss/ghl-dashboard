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
  console.log(`[SYNC] ========== FULL SYNC STARTED for tenant ${tenantId} ==========`);

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
  console.log("[SYNC] Marked sync in progress in DB");

  try {
    // Step 1: Create GHL client (decrypts token)
    console.log("[SYNC] Step 1: Creating GHL client...");
    const ghl = await getGHLClient(tenantId);
    console.log(`[SYNC] GHL client created OK — locationId: ${ghl.getLocationId()}`);

    // Step 2: Sync pipelines
    console.log("[SYNC] Step 2: Fetching pipelines...");
    let pipelines: GHLPipeline[];
    try {
      pipelines = await ghl.getPipelines();
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string };
      console.error(`[SYNC] PIPELINE FETCH FAILED — status: ${e.response?.status}, body: ${JSON.stringify(e.response?.data).substring(0, 300)}, msg: ${e.message}`);
      throw err;
    }
    console.log(`[SYNC] Got ${pipelines.length} pipelines: ${pipelines.map(p => p.name).join(", ")}`);

    for (const pipeline of pipelines) {
      const data = mapPipelineToCache(tenantId, pipeline);
      await prisma.cachedPipeline.upsert({
        where: { id: pipeline.id },
        create: data,
        update: { name: data.name, stages: data.stages, raw: data.raw, cachedAt: new Date() },
      });
      progress.pipelines++;
      console.log(`[SYNC] Cached pipeline: ${pipeline.name} (${pipeline.stages.length} stages)`);

      // Step 3: Sync opportunities per pipeline
      console.log(`[SYNC] Step 3: Fetching opportunities for pipeline "${pipeline.name}"...`);
      await syncOpportunitiesForPipeline(ghl, tenantId, pipeline.id, pipeline.name, progress);
    }
    onProgress?.(progress);

    // Step 4: Sync contacts (paginated)
    console.log("[SYNC] Step 4: Syncing contacts (paginated)...");
    await syncAllContacts(ghl, tenantId, progress, onProgress);

    // Step 5: Sync conversations
    console.log("[SYNC] Step 5: Syncing conversations...");
    await syncConversations(ghl, tenantId, progress);
    onProgress?.(progress);

    // Step 6: Update sync status
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

    console.log(`[SYNC] ========== FULL SYNC COMPLETED ==========`);
    console.log(`[SYNC] Results: ${progress.pipelines} pipelines, ${progress.opportunities} opportunities, ${progress.contacts} contacts, ${progress.conversations} conversations`);
    return progress;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    progress.status = "failed";
    progress.error = msg;

    console.error(`[SYNC] ========== FULL SYNC FAILED ==========`);
    console.error(`[SYNC] Error: ${msg}`);
    console.error(`[SYNC] Stack: ${stack}`);
    console.error(`[SYNC] Progress at failure: pipelines=${progress.pipelines} opps=${progress.opportunities} contacts=${progress.contacts} convs=${progress.conversations}`);

    try {
      await prisma.syncStatus.update({
        where: { tenantId },
        data: { syncInProgress: false, lastError: msg },
      });
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { syncState: "error", lastSyncError: msg },
      });
    } catch (dbErr) {
      console.error("[SYNC] Failed to write error state to DB:", dbErr);
    }

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
  let pageNum = 0;

  while (hasMore) {
    pageNum++;
    let res;
    try {
      console.log(`[SYNC] Contacts page ${pageNum}: fetching (startAfterId=${startAfterId ?? "none"}, startAfter=${startAfter ?? "none"})...`);
      res = await ghl.getContacts({
        limit: batchSize,
        startAfterId,
        startAfter,
      });
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string };
      console.error(`[SYNC] CONTACTS PAGE ${pageNum} FAILED — status: ${e.response?.status}, body: ${JSON.stringify(e.response?.data).substring(0, 300)}, msg: ${e.message}`);
      throw err;
    }

    if (!res.contacts || res.contacts.length === 0) {
      console.log(`[SYNC] Contacts page ${pageNum}: empty response, done`);
      hasMore = false;
      break;
    }

    progress.contactsTotal = res.meta?.total;
    console.log(`[SYNC] Contacts page ${pageNum}: got ${res.contacts.length} records (total: ${res.meta?.total ?? "unknown"}, synced so far: ${progress.contacts})`);

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
      startAfter = undefined;
    } else if (res.meta?.startAfter !== undefined) {
      startAfter = res.meta.startAfter;
      startAfterId = undefined;
    } else {
      // Fallback: use last contact ID
      startAfterId = res.contacts[res.contacts.length - 1].id;
      startAfter = undefined;
    }

    hasMore = res.contacts.length === batchSize;

    // Rate limit: wait 150ms between pages
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`[SYNC] Contacts sync done: ${progress.contacts} total`);
}

async function syncOpportunitiesForPipeline(
  ghl: GHLClient,
  tenantId: string,
  pipelineId: string,
  pipelineName: string,
  progress: SyncProgress
) {
  let startAfterId: string | undefined;
  let hasMore = true;
  let pageNum = 0;
  const startCount = progress.opportunities;

  while (hasMore) {
    pageNum++;
    let res;
    try {
      res = await ghl.getOpportunities(pipelineId, {
        limit: 20,
        startAfterId,
      });
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string };
      console.error(`[SYNC] OPPS page ${pageNum} for "${pipelineName}" FAILED — status: ${e.response?.status}, body: ${JSON.stringify(e.response?.data).substring(0, 300)}, msg: ${e.message}`);
      throw err;
    }

    if (!res.opportunities || res.opportunities.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`[SYNC] Opps page ${pageNum} for "${pipelineName}": got ${res.opportunities.length} (total synced: ${progress.opportunities})`);

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

  const pipelineCount = progress.opportunities - startCount;
  console.log(`[SYNC] Pipeline "${pipelineName}": ${pipelineCount} opportunities synced`);
}

async function syncConversations(
  ghl: GHLClient,
  tenantId: string,
  progress: SyncProgress
) {
  console.log("[SYNC] Fetching conversations...");
  try {
    const res = await ghl.getConversations({ limit: 100 });

    if (!res.conversations || res.conversations.length === 0) {
      console.log("[SYNC] No conversations found");
      return;
    }

    console.log(`[SYNC] Got ${res.conversations.length} conversations`);

    for (const conv of res.conversations) {
      const data = mapConversationToCache(tenantId, conv);
      await prisma.cachedConversation.upsert({
        where: { id: conv.id },
        create: data,
        update: stripId(data),
      });
      progress.conversations++;
    }

    console.log(`[SYNC] Conversations sync done: ${progress.conversations} total`);
  } catch (err) {
    const e = err as { response?: { status?: number; data?: unknown }; message?: string };
    console.error(`[SYNC] CONVERSATIONS FAILED — status: ${e.response?.status}, body: ${JSON.stringify(e.response?.data).substring(0, 300)}, msg: ${e.message}`);
    throw err;
  }
}

// ==================== INCREMENTAL SYNC ====================

export async function incrementalSync(tenantId: string): Promise<{
  contactsDelta: number;
  needsFullSync: boolean;
}> {
  const ghl = await getGHLClient(tenantId);

  const cachedCount = await prisma.cachedContact.count({ where: { tenantId } });
  const res = await ghl.getContacts({ limit: 1 });
  const ghlTotal = res.meta?.total ?? 0;

  const delta = Math.abs(ghlTotal - cachedCount);
  const mismatchPercent = cachedCount > 0 ? (delta / cachedCount) * 100 : 100;

  log.info(
    { tenantId, cachedCount, ghlTotal, delta, mismatchPercent },
    "Incremental sync check"
  );

  if (mismatchPercent > 10) {
    return { contactsDelta: delta, needsFullSync: true };
  }

  const recentContacts = await ghl.getContacts({ limit: 100 });
  for (const contact of recentContacts.contacts) {
    const data = mapContactToCache(tenantId, contact);
    await prisma.cachedContact.upsert({
      where: { id: contact.id },
      create: data,
      update: stripId(data),
    });
  }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
) {
  const conversationId = data.conversationId as string;
  if (!conversationId) return;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
) {
  const oppId = data.id as string;
  if (!oppId) return;

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
