import { createGHLClient, type GHLClient } from "./client";
import { logger } from "@/lib/logger";

const log = logger.child({ layer: "ghl-api" });

/** Convert params to Record<string, string> for MockGHLClient compat */
function toStringParams(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null) result[key] = String(val);
  }
  return result;
}

// ==================== CONTACTS ====================

export async function getContacts(
  tenantId: string,
  params?: { query?: string; limit?: number; offset?: number }
) {
  const client = await createGHLClient(tenantId);
  const locationId = await getLocationId(tenantId);
  const res = await client.get("/contacts/", {
    params: toStringParams({ locationId, ...params }),
  });
  log.info({ tenantId, count: (res.data as { contacts?: unknown[] }).contacts?.length }, "Contacts fetched");
  return res.data as { contacts: unknown[]; meta: { total: number } };
}

export async function createContact(
  tenantId: string,
  data: { firstName: string; lastName?: string; email?: string; phone?: string; tags?: string[] }
) {
  const client = await createGHLClient(tenantId);
  const locationId = await getLocationId(tenantId);
  const res = await client.post("/contacts/", { ...data, locationId });
  log.info({ tenantId, contactId: (res.data as { contact?: { id?: string } }).contact?.id }, "Contact created");
  return res.data as { contact: unknown };
}

export async function updateContact(
  tenantId: string,
  contactId: string,
  data: Record<string, unknown>
) {
  const client = await createGHLClient(tenantId);
  const res = await client.put(`/contacts/${contactId}`, data);
  log.info({ tenantId, contactId }, "Contact updated");
  return res.data as { contact: unknown };
}

export async function searchContacts(tenantId: string, query: string) {
  const client = await createGHLClient(tenantId);
  const locationId = await getLocationId(tenantId);
  const res = await client.get("/contacts/", {
    params: toStringParams({ locationId, query, limit: 20 }),
  });
  return res.data as { contacts: unknown[] };
}

// ==================== CONVERSATIONS ====================

export async function getConversations(
  tenantId: string,
  params?: { query?: string; limit?: number; offset?: number }
) {
  const client = await createGHLClient(tenantId);
  const locationId = await getLocationId(tenantId);
  const res = await client.get("/conversations/", {
    params: toStringParams({ locationId, ...params }),
  });
  return res.data as { conversations: unknown[] };
}

export async function sendMessage(
  tenantId: string,
  conversationId: string,
  data: { type: string; message?: string; html?: string }
) {
  const client = await createGHLClient(tenantId);
  const res = await client.post(`/conversations/messages`, {
    ...data,
    conversationId,
  });
  log.info({ tenantId, conversationId, type: data.type }, "Message sent via GHL");
  return res.data as { message: unknown };
}

// ==================== PIPELINES ====================

export async function getPipelines(tenantId: string) {
  const client = await createGHLClient(tenantId);
  const locationId = await getLocationId(tenantId);
  const res = await client.get("/opportunities/pipelines", {
    params: toStringParams({ locationId }),
  });
  return res.data as { pipelines: unknown[] };
}

export async function getOpportunities(
  tenantId: string,
  pipelineId: string,
  params?: { limit?: number; offset?: number }
) {
  const client = await createGHLClient(tenantId);
  const locationId = await getLocationId(tenantId);
  const res = await client.get("/opportunities/search", {
    params: toStringParams({ locationId, pipelineId, ...params }),
  });
  return res.data as { opportunities: unknown[] };
}

// ==================== CUSTOM FIELDS ====================

export async function getCustomFields(tenantId: string) {
  const client = await createGHLClient(tenantId);
  const locationId = await getLocationId(tenantId);
  const res = await client.get(`/locations/${locationId}/customFields`);
  return res.data as { customFields: unknown[] };
}

export async function createCustomField(
  tenantId: string,
  data: { name: string; dataType: string; placeholder?: string }
) {
  const client = await createGHLClient(tenantId);
  const locationId = await getLocationId(tenantId);
  const res = await client.post(`/locations/${locationId}/customFields`, data);
  log.info({ tenantId, fieldName: data.name }, "Custom field created in GHL");
  return res.data as { customField: unknown };
}

// ==================== HELPERS ====================

async function getLocationId(tenantId: string): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { ghlLocationId: true },
  });
  if (!tenant.ghlLocationId) {
    throw new Error("GHL not connected — no locationId");
  }
  return tenant.ghlLocationId;
}

/** Test the GHL connection by fetching location info */
export async function testConnection(tenantId: string) {
  const client = await createGHLClient(tenantId);
  const locationId = await getLocationId(tenantId);
  const res = await client.get(`/locations/${locationId}`);
  log.info({ tenantId, locationId }, "GHL connection test OK");
  return res.data as { location: unknown };
}

/** Typed wrapper to avoid casting everywhere */
export type GHLApi = {
  client: GHLClient;
  locationId: string;
};

export async function createGHLApi(tenantId: string): Promise<GHLApi> {
  const [client, locationId] = await Promise.all([
    createGHLClient(tenantId),
    getLocationId(tenantId),
  ]);
  return { client, locationId };
}
