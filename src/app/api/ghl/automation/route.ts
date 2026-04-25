import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const putSchema = z.object({
  autoSyncFields: z.boolean().optional(),
  autoCreateOpps: z.boolean().optional(),
  autoSendTriggers: z.boolean().optional(),
  workflowBookingConfirmed: z.string().nullable().optional(),
  workflowBookingReminder: z.string().nullable().optional(),
  workflowPostTrip: z.string().nullable().optional(),
  workflowReviewRequest: z.string().nullable().optional(),
  workflowEquipmentReady: z.string().nullable().optional(),
  workflowAbandonedCart: z.string().nullable().optional(),
  workflowLoyaltyUpgrade: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const log = logger.child({ tenantId, path: "/api/ghl/automation" });

  try {
    const config = await prisma.gHLAutomationConfig.findUnique({
      where: { tenantId },
    });
    if (!config) {
      return NextResponse.json({
        config: {
          autoSyncFields: true,
          autoCreateOpps: true,
          autoSendTriggers: true,
          workflowBookingConfirmed: null,
          workflowBookingReminder: null,
          workflowPostTrip: null,
          workflowReviewRequest: null,
          workflowEquipmentReady: null,
          workflowAbandonedCart: null,
          workflowLoyaltyUpgrade: null,
        },
      });
    }
    return NextResponse.json({ config });
  } catch (error) {
    log.error({ error }, "Failed to fetch automation config");
    return NextResponse.json(
      { error: "Failed to fetch config", code: "AUTOMATION_FETCH_ERROR" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const log = logger.child({ tenantId, path: "/api/ghl/automation" });

  try {
    const json = await req.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const config = await prisma.gHLAutomationConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });

    log.info("Automation config updated");
    return NextResponse.json({ config });
  } catch (error) {
    log.error({ error }, "Failed to update automation config");
    return NextResponse.json(
      { error: "Failed to update config", code: "AUTOMATION_UPDATE_ERROR" },
      { status: 500 },
    );
  }
}
