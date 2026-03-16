import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/settings/team/invite" });

  try {
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // Check if user already exists in this tenant
    const existing = await prisma.user.findUnique({
      where: { email_tenantId: { email: email.toLowerCase(), tenantId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Este email ya pertenece a tu equipo" }, { status: 409 });
    }

    // Generate invite token
    const inviteToken = randomBytes(32).toString("hex");
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Find default role
    const defaultRole = await prisma.role.findFirst({
      where: { tenantId, name: "Sales Rep" },
    });
    if (!defaultRole) {
      return NextResponse.json({ error: "No se encontró el rol por defecto" }, { status: 500 });
    }

    // Create placeholder user with invite token
    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        tenantId,
        roleId: defaultRole.id,
        inviteToken,
        inviteExpires,
        isActive: false,
      },
    });

    // Build invite URL
    const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/register?invite=${inviteToken}`;

    log.info({ email, inviteToken }, "Team invite created");
    return NextResponse.json({ inviteUrl }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create invite");
    return NextResponse.json({ error: "Error al crear la invitación" }, { status: 500 });
  }
}
