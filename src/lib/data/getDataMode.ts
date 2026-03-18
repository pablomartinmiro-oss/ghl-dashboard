import { prisma } from "@/lib/db";

/**
 * Check if tenant has GHL connected.
 * Returns "live" if tenant has a GHL access token, "disconnected" otherwise.
 * Mock mode has been removed — tenants either have real GHL data or nothing.
 */
export async function getDataMode(tenantId: string): Promise<"live" | "disconnected"> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { ghlAccessToken: true },
  });
  return tenant?.ghlAccessToken ? "live" : "disconnected";
}
