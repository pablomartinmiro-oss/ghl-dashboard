import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const STATUSES = ["pending", "active", "expired", "suspended"] as const;

const upsertSchema = z.object({
  registryNumber: z.string().max(50).nullable().optional(),
  communityCode: z.string().max(10).nullable().optional(),
  companyName: z.string().min(1).max(200),
  cif: z.string().max(20).nullable().optional(),
  registeredAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(STATUSES).optional(),
  insurancePolicy: z.string().max(100).nullable().optional(),
  insuranceExpiry: z.string().datetime().nullable().optional(),
  civilLiability: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;

  const registry = await prisma.rEAVRegistry.findUnique({ where: { tenantId } });
  return NextResponse.json({ registry });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reav/registry" });

  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const data = {
      companyName: d.companyName,
      registryNumber: d.registryNumber ?? null,
      communityCode: d.communityCode ?? null,
      cif: d.cif ?? null,
      registeredAt: d.registeredAt ? new Date(d.registeredAt) : null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      status: d.status ?? "pending",
      insurancePolicy: d.insurancePolicy ?? null,
      insuranceExpiry: d.insuranceExpiry ? new Date(d.insuranceExpiry) : null,
      civilLiability: d.civilLiability ?? null,
      notes: d.notes ?? null,
    };

    const registry = await prisma.rEAVRegistry.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });

    log.info({ registryId: registry.id }, "REAV registry upserted");
    return NextResponse.json({ registry });
  } catch (error) {
    log.error({ error }, "Failed to upsert REAV registry");
    return NextResponse.json({ error: "Failed to save registry" }, { status: 500 });
  }
}
