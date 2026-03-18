/**
 * Fetch and cache GHL custom field definitions for a tenant.
 * GHL webhooks send custom fields by ID, not by key name.
 * This module resolves IDs → fieldKey values.
 */

import { getCachedOrFetch } from "@/lib/cache/redis";
import { getGHLClient } from "@/lib/ghl/api";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "ghl:custom-fields" });
const CACHE_TTL = 86_400; // 24 hours

/**
 * Returns a map of { [fieldId]: fieldKey } for the tenant's GHL location.
 * Cached in Redis for 24h. Returns {} if GHL is not connected.
 */
export async function getCustomFieldIdToKeyMap(tenantId: string): Promise<Record<string, string>> {
  return getCachedOrFetch(
    `ghl:custom-fields:${tenantId}`,
    CACHE_TTL,
    async () => {
      try {
        const ghl = await getGHLClient(tenantId);
        const fields = await ghl.getCustomFields();
        const map: Record<string, string> = {};
        for (const f of fields) map[f.id] = f.fieldKey;
        log.info({ tenantId, count: fields.length }, "Custom field ID→key map fetched and cached");
        return map;
      } catch (err) {
        log.warn({ tenantId, error: err }, "Could not fetch custom field definitions — ID resolution skipped");
        return {};
      }
    }
  );
}
