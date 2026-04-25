import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  type: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  issuedBy: z.string().max(120).nullable().optional(),
  issuedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  documentUrl: z.string().url().nullable().optional(),
  status: z.enum(["active", "expired", "pending_renewal"]).optional(),
});

async function ensureInstructor(tenantId: string, instructorId: string) {
  return prisma.instructor.findFirst({ where: { id: instructorId, tenantId } });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ins = await ensureInstructor(session.user.tenantId, id);
  if (!ins) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const certifications = await prisma.instructorCertification.findMany({
    where: { instructorId: id },
    orderBy: { issuedAt: "desc" },
  });
  return NextResponse.json({ certifications });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ins = await ensureInstructor(session.user.tenantId, id);
  if (!ins) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    const d = parsed.data;

    const cert = await prisma.instructorCertification.create({
      data: {
        instructorId: id,
        type: d.type,
        name: d.name,
        issuedBy: d.issuedBy ?? null,
        issuedAt: d.issuedAt ? new Date(d.issuedAt) : null,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        documentUrl: d.documentUrl ?? null,
        status: d.status ?? "active",
      },
    });
    return NextResponse.json({ certification: cert }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create certification");
    return NextResponse.json({ error: "Failed to create certification" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const certId = request.nextUrl.searchParams.get("certId");
  if (!certId) return NextResponse.json({ error: "certId required" }, { status: 400 });

  const ins = await ensureInstructor(session.user.tenantId, id);
  if (!ins) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cert = await prisma.instructorCertification.findFirst({ where: { id: certId, instructorId: id } });
  if (!cert) return NextResponse.json({ error: "Certification not found" }, { status: 404 });

  await prisma.instructorCertification.delete({ where: { id: certId } });
  return NextResponse.json({ success: true });
}
