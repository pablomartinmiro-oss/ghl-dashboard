import { prisma } from "@/lib/db";

export async function getDataMode(tenantId: string): Promise<"mock" | "live"> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { dataMode: true },
  });
  return tenant?.dataMode === "live" ? "live" : "mock";
}
