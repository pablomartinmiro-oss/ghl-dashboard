import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { savePaymentConfig } from "@/lib/payments";

const log = logger.child({ path: "/api/checkout/config" });

const updateSchema = z.object({
  redsysEnabled: z.boolean().optional(),
  redsysMerchant: z.string().max(40).nullable().optional(),
  redsysTerminal: z.string().max(10).nullable().optional(),
  redsysSecret: z.string().max(200).nullable().optional(),
  redsysEnv: z.enum(["test", "live"]).optional(),
  stripeEnabled: z.boolean().optional(),
  stripePublicKey: z.string().max(200).nullable().optional(),
  stripeSecretKey: z.string().max(200).nullable().optional(),
  stripeWebhookSecret: z.string().max(200).nullable().optional(),
  allowPartialPayments: z.boolean().optional(),
  depositPct: z.number().int().min(0).max(100).nullable().optional(),
});

function publicConfig(cfg: {
  id: string;
  redsysEnabled: boolean;
  redsysMerchant: string | null;
  redsysTerminal: string | null;
  redsysSecret: string | null;
  redsysEnv: string;
  stripeEnabled: boolean;
  stripePublicKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  allowPartialPayments: boolean;
  depositPct: number | null;
}) {
  return {
    id: cfg.id,
    redsysEnabled: cfg.redsysEnabled,
    redsysMerchant: cfg.redsysMerchant,
    redsysTerminal: cfg.redsysTerminal,
    redsysEnv: cfg.redsysEnv,
    redsysSecretSet: Boolean(cfg.redsysSecret),
    stripeEnabled: cfg.stripeEnabled,
    stripePublicKey: cfg.stripePublicKey,
    stripeSecretKeySet: Boolean(cfg.stripeSecretKey),
    stripeWebhookSecretSet: Boolean(cfg.stripeWebhookSecret),
    allowPartialPayments: cfg.allowPartialPayments,
    depositPct: cfg.depositPct,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;

  const cfg = await prisma.paymentConfig.findUnique({ where: { tenantId } });
  if (!cfg) {
    return NextResponse.json({
      config: {
        id: null,
        redsysEnabled: false,
        redsysMerchant: null,
        redsysTerminal: "1",
        redsysEnv: "test",
        redsysSecretSet: false,
        stripeEnabled: false,
        stripePublicKey: null,
        stripeSecretKeySet: false,
        stripeWebhookSecretSet: false,
        allowPartialPayments: false,
        depositPct: null,
      },
    });
  }
  return NextResponse.json({ config: publicConfig(cfg) });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.roleName !== "Owner") {
    return NextResponse.json({ error: "Solo el propietario puede modificar pagos" }, { status: 403 });
  }
  const { tenantId } = session.user;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const saved = await savePaymentConfig(tenantId, parsed.data);
    log.info({ tenantId }, "Payment config updated");
    return NextResponse.json({ config: publicConfig(saved) });
  } catch (error) {
    log.error({ error, tenantId }, "Save payment config failed");
    return NextResponse.json({ error: "Error al guardar configuracion" }, { status: 500 });
  }
}
