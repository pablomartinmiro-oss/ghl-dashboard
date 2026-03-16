import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, verifyOAuthState } from "@/lib/ghl/oauth";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || req.url;
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  if (!code || !stateParam) {
    logger.warn("GHL OAuth callback missing code or state");
    return NextResponse.redirect(
      new URL("/onboarding?error=missing_params", baseUrl)
    );
  }

  // Verify HMAC-signed state to prevent CSRF
  const stateData = verifyOAuthState(stateParam);
  if (!stateData) {
    logger.error({ state: stateParam }, "GHL OAuth callback: invalid state signature");
    return NextResponse.redirect(
      new URL("/onboarding?error=invalid_state", baseUrl)
    );
  }

  const { tenantId, origin } = stateData;

  try {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      logger.error({ tenantId }, "GHL OAuth callback: tenant not found");
      return NextResponse.redirect(
        new URL("/onboarding?error=invalid_tenant", baseUrl)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store encrypted tokens on tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ghlLocationId: tokens.locationId,
        ghlAccessToken: encrypt(tokens.access_token),
        ghlRefreshToken: encrypt(tokens.refresh_token),
        ghlTokenExpiry: new Date(
          Date.now() + tokens.expires_in * 1000
        ),
        ghlConnectedAt: new Date(),
      },
    });

    logger.info(
      { tenantId, locationId: tokens.locationId },
      "GHL connected successfully"
    );

    // Redirect based on where the flow started
    if (origin === "settings") {
      return NextResponse.redirect(
        new URL("/settings?ghl_connected=true", baseUrl)
      );
    }

    return NextResponse.redirect(
      new URL("/onboarding?ghl_connected=true", baseUrl)
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message, tenantId }, "GHL OAuth callback failed");

    const errorRedirect = origin === "settings" ? "/settings" : "/onboarding";
    return NextResponse.redirect(
      new URL(`${errorRedirect}?error=oauth_failed`, baseUrl)
    );
  }
}
