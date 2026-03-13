import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/ghl/oauth";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // tenantId

  if (!code || !state) {
    logger.warn("GHL OAuth callback missing code or state");
    return NextResponse.redirect(
      new URL("/onboarding?error=missing_params", req.url)
    );
  }

  try {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: state },
    });

    if (!tenant) {
      logger.error({ state }, "GHL OAuth callback: tenant not found");
      return NextResponse.redirect(
        new URL("/onboarding?error=invalid_tenant", req.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store encrypted tokens on tenant
    await prisma.tenant.update({
      where: { id: state },
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
      { tenantId: state, locationId: tokens.locationId },
      "GHL connected successfully"
    );

    return NextResponse.redirect(
      new URL("/onboarding?step=team&ghl=connected", req.url)
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message, state }, "GHL OAuth callback failed");

    return NextResponse.redirect(
      new URL(`/onboarding?error=oauth_failed`, req.url)
    );
  }
}
