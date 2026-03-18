import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId } = session.user;
  const borrador = await prisma.quote.count({ where: { tenantId, status: "borrador" } });
  return NextResponse.json({ borrador });
}
