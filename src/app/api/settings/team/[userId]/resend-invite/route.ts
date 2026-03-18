import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email/client";

function buildInviteEmailHTML(inviteUrl: string): string {
  return `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #FAF9F7;">
      <h2 style="color: #2D2A26; font-size: 20px; margin-bottom: 8px;">Bienvenido al equipo de Skicenter</h2>
      <p style="color: #8A8580; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Te han invitado a unirte al Dashboard de gestión de Skicenter.<br>
        Haz clic en el botón para crear tu cuenta y empezar.
      </p>
      <a href="${inviteUrl}" style="display: inline-block; background: #E87B5A; color: #fff; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">
        Crear mi cuenta
      </a>
      <p style="color: #8A8580; font-size: 12px; margin-top: 24px;">
        El enlace expira en 7 días. Si no esperabas este email, ignóralo.
      </p>
    </div>
  `;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const { userId } = await params;
  const log = logger.child({ tenantId, path: `/api/settings/team/${userId}/resend-invite` });

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: false },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado o ya activo" }, { status: 404 });
    }

    // Regenerate token so the link is fresh
    const inviteToken = randomBytes(32).toString("hex");
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { inviteToken, inviteExpires },
    });

    const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/register?invite=${inviteToken}`;

    await sendEmail({
      tenantId,
      contactId: null,
      to: user.email,
      subject: "Has sido invitado al Dashboard de Skicenter",
      html: buildInviteEmailHTML(inviteUrl),
    });

    log.info({ userId, email: user.email }, "Invite resent");
    return NextResponse.json({ success: true, inviteUrl });
  } catch (error) {
    log.error({ error }, "Failed to resend invite");
    return NextResponse.json({ error: "Error al reenviar la invitación" }, { status: 500 });
  }
}
