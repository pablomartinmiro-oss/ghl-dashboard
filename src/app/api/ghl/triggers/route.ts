import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { triggerWorkflow } from "@/lib/ghl/workflows";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  workflowId: z.string().min(1),
  contactId: z.string().min(1),
  eventData: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const log = logger.child({ tenantId, path: "/api/ghl/triggers" });

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { workflowId, contactId, eventData } = parsed.data;

    await triggerWorkflow(tenantId, contactId, workflowId, eventData);
    log.info({ workflowId, contactId }, "Triggered GHL workflow");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Failed to trigger GHL workflow");
    return NextResponse.json(
      { error: "Failed to trigger workflow", code: "GHL_TRIGGER_ERROR" },
      { status: 500 },
    );
  }
}
