import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getAuthorizeUrl } from "@/lib/ghl/oauth";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use tenantId as state parameter to map callback back to tenant
  const state = session.user.tenantId;
  const authorizeUrl = getAuthorizeUrl(state);

  logger.info(
    { tenantId: state },
    "Redirecting to GHL OAuth authorization"
  );

  return NextResponse.redirect(authorizeUrl);
}
