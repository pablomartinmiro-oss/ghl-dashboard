import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type ApiAuthResult = {
  tenantId: string;
  permissions: string[];
  apiKeyId: string;
} | null;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey) return xApiKey.trim();
  return null;
}

export async function verifyApiKey(request: NextRequest): Promise<ApiAuthResult> {
  const key = extractApiKey(request);
  if (!key) return null;

  const keyHash = hashKey(key);

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      active: true,
    },
  });

  if (!apiKey) return null;

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update lastUsedAt async (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  const permissions = Array.isArray(apiKey.permissions)
    ? (apiKey.permissions as string[])
    : [];

  return {
    tenantId: apiKey.tenantId,
    permissions,
    apiKeyId: apiKey.id,
  };
}

export function hashApiKey(key: string): string {
  return hashKey(key);
}
