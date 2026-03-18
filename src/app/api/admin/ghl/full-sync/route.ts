import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { fullSync } from "@/lib/ghl/sync";
import { prisma } from "@/lib/db";

// Railway runs next start (persistent server), not serverless.
// Allow up to 5 minutes for the sync to complete.
export const maxDuration = 300;

export async function POST() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;

  // Check if sync is already in progress
  const syncStatus = await prisma.syncStatus.findUnique({
    where: { tenantId },
  });
  if (syncStatus?.syncInProgress) {
    return NextResponse.json(
      { message: "Sincronización ya en progreso" },
      { status: 202 }
    );
  }

  console.log(`[SYNC-ROUTE] POST received for tenant ${tenantId}`);

  // Fire-and-forget: Railway runs a persistent Node.js server,
  // so promises survive after HTTP response.
  // We wrap in a try/catch that writes errors to DB.
  const syncPromise = fullSync(tenantId);

  syncPromise
    .then((result) => {
      console.log(`[SYNC-ROUTE] Background sync finished: ${result.status} — ${result.contacts} contacts, ${result.opportunities} opps`);
    })
    .catch(async (error) => {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[SYNC-ROUTE] Background sync CRASHED: ${msg}`);
      // Safety: make sure DB is updated even if fullSync's internal catch failed
      try {
        await prisma.syncStatus.upsert({
          where: { tenantId },
          create: { tenantId, syncInProgress: false, lastError: msg },
          update: { syncInProgress: false, lastError: msg },
        });
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { syncState: "error", lastSyncError: msg },
        });
      } catch (dbErr) {
        console.error("[SYNC-ROUTE] Failed to write error to DB:", dbErr);
      }
    });

  // Keep the promise alive — don't let Node.js GC it
  // This is critical for fire-and-forget in persistent servers
  if (typeof globalThis !== "undefined") {
    const g = globalThis as unknown as { __activeSyncs?: Set<Promise<unknown>> };
    if (!g.__activeSyncs) g.__activeSyncs = new Set();
    g.__activeSyncs.add(syncPromise);
    syncPromise.finally(() => g.__activeSyncs?.delete(syncPromise));
  }

  return NextResponse.json(
    { message: "Sincronización iniciada", status: "syncing" },
    { status: 202 }
  );
}
