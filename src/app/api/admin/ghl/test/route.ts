import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import axios from "axios";

const log = logger.child({ path: "/api/admin/ghl/test" });

/**
 * Comprehensive GHL connection diagnostic.
 * Tests every link in the chain: DB → decrypt → GHL API.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const diagnostics: Record<string, unknown> = {
    tenantId,
    timestamp: new Date().toISOString(),
  };

  try {
    // Step 1: Read tenant from DB
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        ghlLocationId: true,
        ghlAccessToken: true,
        ghlRefreshToken: true,
        ghlTokenExpiry: true,
        ghlConnectedAt: true,
        syncState: true,
        lastSyncAt: true,
        lastSyncError: true,
      },
    });

    diagnostics.step1_db = {
      found: !!tenant,
      hasLocationId: !!tenant?.ghlLocationId,
      locationId: tenant?.ghlLocationId,
      hasAccessToken: !!tenant?.ghlAccessToken,
      accessTokenLength: tenant?.ghlAccessToken?.length ?? 0,
      hasRefreshToken: !!tenant?.ghlRefreshToken,
      tokenExpiry: tenant?.ghlTokenExpiry?.toISOString() ?? "null",
      tokenExpired: tenant?.ghlTokenExpiry ? new Date() > tenant.ghlTokenExpiry : "no expiry set",
      connectedAt: tenant?.ghlConnectedAt?.toISOString() ?? "null",
      syncState: tenant?.syncState,
      lastSyncAt: tenant?.lastSyncAt?.toISOString() ?? "null",
      lastSyncError: tenant?.lastSyncError,
    };

    if (!tenant?.ghlAccessToken) {
      diagnostics.error = "No ghlAccessToken in database";
      log.error(diagnostics, "GHL test: no access token");
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Step 2: Decrypt the token
    let accessToken: string;
    try {
      accessToken = decrypt(tenant.ghlAccessToken);
      diagnostics.step2_decrypt = {
        success: true,
        decryptedLength: accessToken.length,
        looksLikeJWT: accessToken.includes("."),
      };
    } catch (decryptError) {
      const msg = decryptError instanceof Error ? decryptError.message : String(decryptError);
      diagnostics.step2_decrypt = { success: false, error: msg };
      diagnostics.error = `Decryption failed: ${msg}`;
      log.error(diagnostics, "GHL test: decrypt failed");
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Step 3: Check ENCRYPTION_KEY is set
    diagnostics.step3_env = {
      hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
      encryptionKeyLength: process.env.ENCRYPTION_KEY?.length ?? 0,
      hasGhlClientId: !!process.env.GHL_CLIENT_ID,
      hasGhlClientSecret: !!process.env.GHL_CLIENT_SECRET,
    };

    // Step 4: Call GHL API directly — GET /locations/{locationId}
    const locationId = tenant.ghlLocationId!;
    try {
      const locationRes = await axios.get(
        `https://services.leadconnectorhq.com/locations/${locationId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: "2021-07-28",
            "Content-Type": "application/json",
          },
          timeout: 10000,
          validateStatus: () => true, // Don't throw on 4xx/5xx
        }
      );

      diagnostics.step4_ghl_location = {
        status: locationRes.status,
        statusText: locationRes.statusText,
        hasData: !!locationRes.data,
        locationName: locationRes.data?.location?.name ?? locationRes.data?.name ?? null,
        // Show full response body for non-200
        responseBody: locationRes.status !== 200
          ? JSON.stringify(locationRes.data).substring(0, 500)
          : undefined,
      };

      if (locationRes.status === 401) {
        diagnostics.tokenStatus = "EXPIRED — needs refresh";
      }
    } catch (apiError) {
      const msg = apiError instanceof Error ? apiError.message : String(apiError);
      diagnostics.step4_ghl_location = {
        error: msg,
        isTimeout: msg.includes("timeout"),
        isNetwork: msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND"),
      };
    }

    // Step 5: Try contacts endpoint — GET /contacts/ with limit=1
    try {
      const contactsRes = await axios.get(
        "https://services.leadconnectorhq.com/contacts/",
        {
          params: { locationId, limit: 1 },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: "2021-07-28",
          },
          timeout: 10000,
          validateStatus: () => true,
        }
      );

      diagnostics.step5_ghl_contacts = {
        status: contactsRes.status,
        statusText: contactsRes.statusText,
        totalContacts: contactsRes.data?.meta?.total ?? contactsRes.data?.total ?? "unknown",
        contactsReturned: contactsRes.data?.contacts?.length ?? 0,
        firstContactName: contactsRes.data?.contacts?.[0]?.name ?? contactsRes.data?.contacts?.[0]?.firstName ?? null,
        responseBody: contactsRes.status !== 200
          ? JSON.stringify(contactsRes.data).substring(0, 500)
          : undefined,
      };
    } catch (apiError) {
      const msg = apiError instanceof Error ? apiError.message : String(apiError);
      diagnostics.step5_ghl_contacts = { error: msg };
    }

    // Step 6: Try pipelines endpoint
    try {
      const pipelinesRes = await axios.get(
        "https://services.leadconnectorhq.com/opportunities/pipelines",
        {
          params: { locationId },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: "2021-07-28",
          },
          timeout: 10000,
          validateStatus: () => true,
        }
      );

      diagnostics.step6_ghl_pipelines = {
        status: pipelinesRes.status,
        statusText: pipelinesRes.statusText,
        pipelineCount: pipelinesRes.data?.pipelines?.length ?? 0,
        pipelineNames: pipelinesRes.data?.pipelines?.map((p: { name: string }) => p.name) ?? [],
        responseBody: pipelinesRes.status !== 200
          ? JSON.stringify(pipelinesRes.data).substring(0, 500)
          : undefined,
      };
    } catch (apiError) {
      const msg = apiError instanceof Error ? apiError.message : String(apiError);
      diagnostics.step6_ghl_pipelines = { error: msg };
    }

    // Step 7: If token expired, try refresh
    const tokenExpired =
      (diagnostics.step4_ghl_location as Record<string, unknown>)?.status === 401 ||
      (diagnostics.step5_ghl_contacts as Record<string, unknown>)?.status === 401;

    if (tokenExpired && tenant.ghlRefreshToken) {
      try {
        const refreshToken = decrypt(tenant.ghlRefreshToken);
        const refreshRes = await axios.post(
          "https://services.leadconnectorhq.com/oauth/token",
          new URLSearchParams({
            client_id: process.env.GHL_CLIENT_ID ?? "",
            client_secret: process.env.GHL_CLIENT_SECRET ?? "",
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }).toString(),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 10000,
            validateStatus: () => true,
          }
        );

        diagnostics.step7_refresh = {
          status: refreshRes.status,
          hasNewAccessToken: !!refreshRes.data?.access_token,
          hasNewRefreshToken: !!refreshRes.data?.refresh_token,
          responseBody: refreshRes.status !== 200
            ? JSON.stringify(refreshRes.data).substring(0, 500)
            : "success (tokens redacted)",
        };
      } catch (refreshError) {
        const msg = refreshError instanceof Error ? refreshError.message : String(refreshError);
        diagnostics.step7_refresh = { error: msg };
      }
    }

    // Step 8: Check SyncStatus table
    const syncStatus = await prisma.syncStatus.findUnique({ where: { tenantId } });
    diagnostics.step8_sync_status = syncStatus
      ? {
          syncInProgress: syncStatus.syncInProgress,
          lastFullSync: syncStatus.lastFullSync?.toISOString() ?? null,
          lastIncrSync: syncStatus.lastIncrSync?.toISOString() ?? null,
          contactCount: syncStatus.contactCount,
          opportunityCount: syncStatus.opportunityCount,
          pipelineCount: syncStatus.pipelineCount,
          conversationCount: syncStatus.conversationCount,
          lastError: syncStatus.lastError,
        }
      : "no SyncStatus record";

    // Summary
    diagnostics.summary = tokenExpired
      ? "TOKEN EXPIRED — check step7 for refresh result"
      : "Token valid — check step4/5/6 for API responses";

    log.info(diagnostics, "GHL test complete");
    return NextResponse.json(diagnostics);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    diagnostics.fatalError = { message: msg, stack };
    log.error(diagnostics, "GHL test fatal error");
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
