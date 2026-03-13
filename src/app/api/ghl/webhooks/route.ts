import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  invalidateContactCaches,
  invalidateConversationCaches,
  invalidateOpportunityCaches,
} from "@/lib/cache/invalidation";

// GHL raw response — webhook payload varies by event type
interface WebhookPayload {
  type: string;
  locationId: string;
  [key: string]: unknown;
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  // If no secret configured, skip verification (dev mode)
  if (!secret) return true;
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signature === expected;
}

export async function POST(req: NextRequest) {
  const log = logger.child({ path: "/api/ghl/webhooks" });

  // Read raw body for signature verification
  const rawBody = await req.text();
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

  // Log the webhook regardless
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
    // Invalidate caches based on event type
    if (type.startsWith("Contact")) {
      const contactId = (payload as Record<string, string>).contactId;
      await invalidateContactCaches(tenantId, contactId);
    }

    if (
      type.startsWith("Conversation") ||
      type === "InboundMessage" ||
      type === "OutboundMessage"
    ) {
      const conversationId = (payload as Record<string, string>).conversationId;
      await invalidateConversationCaches(tenantId, conversationId);
    }

    if (type.startsWith("Opportunity")) {
      const pipelineId = (payload as Record<string, string>).pipelineId;
      if (pipelineId) {
        await invalidateOpportunityCaches(tenantId, pipelineId);
      }
    }

    // Mark as processed
    await prisma.webhookLog.updateMany({
      where: {
        tenantId,
        event: type,
        status: "received",
      },
      data: {
        status: "processed",
        processedAt: new Date(),
      },
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
