import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const DEFAULT_OWNER_PERMISSIONS = [
  "comms:view", "comms:send", "comms:assign",
  "pipelines:view", "pipelines:edit", "pipelines:create", "pipelines:delete",
  "analytics:view", "analytics:export",
  "contacts:view", "contacts:edit", "contacts:create", "contacts:delete",
  "reservations:view", "reservations:create", "reservations:edit",
  "settings:team", "settings:tenant",
];

const DEFAULT_REP_PERMISSIONS = [
  "comms:view", "comms:send",
  "pipelines:view", "pipelines:edit", "pipelines:create",
  "contacts:view",
  "reservations:view", "reservations:create",
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function POST(request: NextRequest) {
  const log = logger.child({ path: "/api/auth/register" });

  try {
    const body = await request.json();
    const { name, email, password, companyName, inviteToken } = body as {
      name: string;
      email: string;
      password: string;
      companyName?: string;
      inviteToken?: string;
    };

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña son obligatorios" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    // INVITE FLOW: join existing tenant
    if (inviteToken) {
      const invitedUser = await prisma.user.findUnique({
        where: { inviteToken },
        include: { tenant: true },
      });

      if (!invitedUser || !invitedUser.inviteExpires || invitedUser.inviteExpires < new Date()) {
        return NextResponse.json({ error: "Invitación inválida o expirada" }, { status: 400 });
      }

      // Find default "Sales Rep" role for this tenant, or first role
      const repRole = await prisma.role.findFirst({
        where: { tenantId: invitedUser.tenantId, name: "Sales Rep" },
      });
      const fallbackRole = repRole || await prisma.role.findFirst({
        where: { tenantId: invitedUser.tenantId },
      });

      if (!fallbackRole) {
        return NextResponse.json({ error: "Error de configuración del equipo" }, { status: 500 });
      }

      // Update the invited user placeholder with real data
      await prisma.user.update({
        where: { id: invitedUser.id },
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          inviteToken: null,
          inviteExpires: null,
          roleId: fallbackRole.id,
          isActive: true,
        },
      });

      log.info({ email, tenantId: invitedUser.tenantId }, "User registered via invite");
      return NextResponse.json({ success: true, redirect: "/" });
    }

    // NEW TENANT FLOW
    if (!companyName) {
      return NextResponse.json({ error: "El nombre de la empresa es obligatorio" }, { status: 400 });
    }

    // Check if email already exists globally
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
    }

    // Generate unique slug
    let slug = generateSlug(companyName);
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create tenant + roles + user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          dataMode: "mock",
          onboardingComplete: false,
        },
      });

      const ownerRole = await tx.role.create({
        data: {
          name: "Owner / Manager",
          tenantId: tenant.id,
          isSystem: true,
          permissions: DEFAULT_OWNER_PERMISSIONS,
        },
      });

      // Create additional default roles
      await tx.role.createMany({
        data: [
          { name: "Sales Rep", tenantId: tenant.id, isSystem: true, permissions: DEFAULT_REP_PERMISSIONS },
          { name: "Marketing", tenantId: tenant.id, isSystem: true, permissions: ["analytics:view", "analytics:export", "contacts:view"] },
          { name: "VA / Admin", tenantId: tenant.id, isSystem: true, permissions: ["contacts:view", "contacts:edit", "contacts:create", "comms:view", "comms:send", "reservations:view", "reservations:create", "reservations:edit"] },
        ],
      });

      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          passwordHash,
          tenantId: tenant.id,
          roleId: ownerRole.id,
        },
      });

      // Enable default modules
      await tx.moduleConfig.createMany({
        data: ["comms", "pipelines", "analytics", "contacts"].map((mod) => ({
          tenantId: tenant.id,
          module: mod,
          isEnabled: true,
        })),
      });

      return { tenant, user };
    });

    log.info({ email, tenantId: result.tenant.id }, "New tenant registered");
    return NextResponse.json({ success: true, redirect: "/onboarding" }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Registration failed");
    return NextResponse.json({ error: "Error al crear la cuenta" }, { status: 500 });
  }
}
