import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  invalidateContactCaches,
  invalidateConversationCaches,
  invalidateOpportunityCaches,
} from "@/lib/cache/invalidation";
import { maybeCreateQuoteFromSurvey } from "@/lib/quotes/from-survey";
import {
  upsertCachedContact,
  deleteCachedContact,
  updateCachedContactTags,
  updateCachedContactDnd,
  cacheMessage,
  upsertCachedOpportunity,
  updateCachedOpportunityField,
} from "@/lib/ghl/sync";

// GHL raw response — webhook payload varies by event type
interface WebhookPayload {
  type: string;
  locationId: string;
  [key: string]: unknown;
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signature === expected;
}

export async function POST(req: NextRequest) {
  const log = logger.child({ path: "/api/crm/webhooks" });

  const rawBody = await req.text();
  console.log("[WEBHOOK] Received:", req.method, rawBody);
  const signature = req.headers.get("x-ghl-signature");

  if (!verifySignature(rawBody, signature)) {
    log.warn("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    log.warn("Invalid webhook JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, locationId } = payload;

  if (!type || !locationId) {
    log.warn({ payload }, "Missing type or locationId in webhook");
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Find tenant by GHL location ID
  const tenant = await prisma.tenant.findUnique({
    where: { ghlLocationId: locationId },
    select: { id: true },
  });

  // Log the webhook
  await prisma.webhookLog.create({
    data: {
      tenantId: tenant?.id ?? null,
      event: type,
      payload: JSON.parse(JSON.stringify(payload)),
      status: tenant ? "received" : "failed",
      error: tenant ? null : `Unknown locationId: ${locationId}`,
    },
  });

  if (!tenant) {
    log.warn({ locationId, type }, "Webhook from unknown location");
    return NextResponse.json({ received: true });
  }

  const tenantId = tenant.id;
  log.info({ tenantId, event: type }, "Processing webhook");

  try {
    const data = (payload as Record<string, unknown>);

    switch (type) {
      // ==================== CONTACTS ====================
      case "ContactCreate":
        await upsertCachedContact(tenantId, data);
        await invalidateContactCaches(tenantId, (data.contactId as string) ?? (data.id as string));
        // Auto-create draft quote if contact has survey data
        await maybeCreateQuoteFromSurvey(tenantId, data).catch((err) =>
          log.error({ error: err }, "Failed to create quote from survey")
        );
        break;

      case "ContactUpdate":
        await upsertCachedContact(tenantId, data);
        await invalidateContactCaches(tenantId, (data.contactId as string) ?? (data.id as string));
        break;

      case "ContactDelete":
        await deleteCachedContact(tenantId, (data.id as string) ?? (data.contactId as string));
        await invalidateContactCaches(tenantId, data.id as string);
        break;

      case "ContactTagUpdate":
        await updateCachedContactTags(tenantId, data);
        await invalidateContactCaches(tenantId, data.id as string ?? data.contactId as string);
        break;

      case "ContactDndUpdate":
        await updateCachedContactDnd(tenantId, data);
        break;

      // ==================== MESSAGES ====================
      case "InboundMessage":
      case "OutboundMessage":
        await cacheMessage(tenantId, data);
        await invalidateConversationCaches(tenantId, data.conversationId as string);
        break;

      // ==================== OPPORTUNITIES ====================
      case "OpportunityCreate":
        await upsertCachedOpportunity(tenantId, data);
        if (data.pipelineId) {
          await invalidateOpportunityCaches(tenantId, data.pipelineId as string);
        }
        break;

      case "OpportunityStageUpdate":
      case "OpportunityStatusUpdate":
      case "OpportunityMonetaryValueUpdate":
        await updateCachedOpportunityField(tenantId, data);
        if (data.pipelineId) {
          await invalidateOpportunityCaches(tenantId, data.pipelineId as string);
        }
        break;

      // ==================== NOTES & TASKS ====================
      case "NoteCreate":
      case "TaskCreate":
        // Invalidate contact cache so notes/tasks show fresh
        if (data.contactId) {
          await invalidateContactCaches(tenantId, data.contactId as string);
        }
        break;

      default:
        log.info({ event: type }, "Unhandled webhook event type");
    }

    // Mark as processed
    await prisma.webhookLog.updateMany({
      where: { tenantId, event: type, status: "received" },
      data: { status: "processed", processedAt: new Date() },
    });

    log.info({ tenantId, event: type }, "Webhook processed");
  } catch (error) {
    log.error({ tenantId, event: type, error }, "Webhook processing failed");
    await prisma.webhookLog.updateMany({
      where: { tenantId, event: type, status: "received" },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }

  // Always return 200 to avoid GHL retries
  return NextResponse.json({ received: true });
}
