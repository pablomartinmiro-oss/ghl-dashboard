import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const waiver = await prisma.digitalWaiver.findFirst({
    where: { id, tenantId },
    include: { equipment: true },
  });
  if (!waiver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ waiver });
}
