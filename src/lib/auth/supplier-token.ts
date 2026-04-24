import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const ISSUER = "skicenter-supplier-portal";
const AUDIENCE = "supplier";
const EXPIRES_IN = "24h";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export interface SupplierTokenPayload {
  supplierId: string;
  tenantId: string;
}

export async function signSupplierToken(
  supplierId: string,
  tenantId: string
): Promise<string> {
  return new SignJWT({ supplierId, tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret());
}

export async function verifySupplierToken(
  token: string
): Promise<SupplierTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const supplierId = payload.supplierId;
    const tenantId = payload.tenantId;
    if (typeof supplierId !== "string" || typeof tenantId !== "string") {
      return null;
    }
    return { supplierId, tenantId };
  } catch {
    return null;
  }
}

export async function getSupplierSession(
  request: NextRequest
): Promise<SupplierTokenPayload | null> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  return verifySupplierToken(token);
}
