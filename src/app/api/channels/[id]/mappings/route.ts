import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "channels:mappings" });

const mappingSchema = z.object({
  productId: z.string().min(1),
  externalId: z.string().nullable().optional(),
  externalName: z.string().nullable().optional(),
  channelPrice: z.number().int().nullable().optional(),
  enabled: z.boolean().optional(),
});

const putSchema = z.object({
  mappings: z.array(mappingSchema),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const channel = await prisma.channel.findFirst({ where: { id, tenantId } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mappings = await prisma.channelMapping.findMany({
    where: { channelId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ mappings });
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const channel = await prisma.channel.findFirst({ where: { id, tenantId } });
    if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const result = await prisma.$transaction(
      parsed.data.mappings.map((m) =>
        prisma.channelMapping.upsert({
          where: { channelId_productId: { channelId: id, productId: m.productId } },
          create: {
            channelId: id,
            productId: m.productId,
            externalId: m.externalId ?? null,
            externalName: m.externalName ?? null,
            channelPrice: m.channelPrice ?? null,
            enabled: m.enabled ?? true,
          },
          update: {
            externalId: m.externalId ?? null,
            externalName: m.externalName ?? null,
            channelPrice: m.channelPrice ?? null,
            enabled: m.enabled ?? true,
          },
        })
      )
    );

    return NextResponse.json({ mappings: result });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to upsert mappings");
    return NextResponse.json({ error: "Failed to upsert mappings" }, { status: 500 });
  }
}
