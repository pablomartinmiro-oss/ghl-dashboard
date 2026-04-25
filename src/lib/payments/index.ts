import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import {
  createRedsysPayment,
  verifyRedsysCallback,
  generateOrderId,
  type RedsysConfig,
  type RedsysFormResult,
  type RedsysCallbackResult,
} from "./redsys";
import {
  createStripePaymentIntent,
  verifyStripeWebhook,
  processStripeRefund,
  type StripeConfig,
  type StripeIntentResult,
} from "./stripe";

const log = logger.child({ module: "payments" });

export type PaymentProvider = "redsys" | "stripe" | "manual";

export interface CreatePaymentInput {
  tenantId: string;
  provider: PaymentProvider;
  amountCents: number;
  currency?: string;
  customerEmail: string;
  customerName: string;
  description: string;
  cartId?: string;
  bookingRequestId?: string;
  callbackBaseUrl: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentResult {
  paymentIntentId: string;
  provider: PaymentProvider;
  redsys?: RedsysFormResult;
  stripe?: StripeIntentResult & { publicKey: string };
  manual?: { reference: string };
}

interface DecryptedConfig {
  redsysEnabled: boolean;
  redsys?: RedsysConfig;
  stripeEnabled: boolean;
  stripePublicKey?: string;
  stripe?: StripeConfig;
  allowPartialPayments: boolean;
  depositPct: number | null;
}

export async function getPaymentConfig(tenantId: string): Promise<DecryptedConfig | null> {
  const cfg = await prisma.paymentConfig.findUnique({ where: { tenantId } });
  if (!cfg) return null;

  const out: DecryptedConfig = {
    redsysEnabled: cfg.redsysEnabled,
    stripeEnabled: cfg.stripeEnabled,
    allowPartialPayments: cfg.allowPartialPayments,
    depositPct: cfg.depositPct,
  };

  if (cfg.redsysEnabled && cfg.redsysMerchant && cfg.redsysSecret) {
    out.redsys = {
      merchant: cfg.redsysMerchant,
      terminal: cfg.redsysTerminal ?? "1",
      secret: decrypt(cfg.redsysSecret),
      env: (cfg.redsysEnv === "live" ? "live" : "test"),
    };
  }

  if (cfg.stripeEnabled && cfg.stripeSecretKey) {
    out.stripePublicKey = cfg.stripePublicKey ?? undefined;
    out.stripe = {
      secretKey: decrypt(cfg.stripeSecretKey),
      webhookSecret: cfg.stripeWebhookSecret ? decrypt(cfg.stripeWebhookSecret) : undefined,
    };
  }

  return out;
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const cfg = await getPaymentConfig(input.tenantId);
  if (!cfg) throw new Error("Payment config not found for tenant");

  const currency = input.currency ?? "EUR";

  if (input.provider === "redsys") {
    if (!cfg.redsysEnabled || !cfg.redsys) {
      throw new Error("Redsys is not configured for this tenant");
    }
    const orderId = generateOrderId();
    const intent = await prisma.paymentIntent.create({
      data: {
        tenantId: input.tenantId,
        cartId: input.cartId,
        bookingRequestId: input.bookingRequestId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        amountCents: input.amountCents,
        currency,
        provider: "redsys",
        providerRef: orderId,
        status: "pending",
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
      },
    });

    const result = createRedsysPayment(cfg.redsys, {
      amountCents: input.amountCents,
      orderId,
      description: input.description,
      merchantUrl: `${input.callbackBaseUrl}/api/checkout/pay/redsys/callback`,
      urlOk: `${input.callbackBaseUrl}/api/checkout/success?intentId=${intent.id}`,
      urlKo: `${input.callbackBaseUrl}/api/checkout/success?intentId=${intent.id}&error=1`,
    });

    return { paymentIntentId: intent.id, provider: "redsys", redsys: result };
  }

  if (input.provider === "stripe") {
    if (!cfg.stripeEnabled || !cfg.stripe) {
      throw new Error("Stripe is not configured for this tenant");
    }

    const intent = await prisma.paymentIntent.create({
      data: {
        tenantId: input.tenantId,
        cartId: input.cartId,
        bookingRequestId: input.bookingRequestId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        amountCents: input.amountCents,
        currency,
        provider: "stripe",
        status: "pending",
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
      },
    });

    const stripeResult = await createStripePaymentIntent(
      cfg.stripe,
      input.amountCents,
      currency,
      { ...(input.metadata ?? {}), intentId: intent.id, tenantId: input.tenantId }
    );

    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { providerRef: stripeResult.paymentIntentId },
    });

    return {
      paymentIntentId: intent.id,
      provider: "stripe",
      stripe: { ...stripeResult, publicKey: cfg.stripePublicKey ?? "" },
    };
  }

  // Manual
  const intent = await prisma.paymentIntent.create({
    data: {
      tenantId: input.tenantId,
      cartId: input.cartId,
      bookingRequestId: input.bookingRequestId,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      amountCents: input.amountCents,
      currency,
      provider: "manual",
      status: "pending",
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
    },
  });
  return { paymentIntentId: intent.id, provider: "manual", manual: { reference: intent.id } };
}

export async function processRefund(
  tenantId: string,
  paymentIntentId: string,
  amountCents?: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const intent = await prisma.paymentIntent.findFirst({
    where: { id: paymentIntentId, tenantId },
  });
  if (!intent) return { ok: false, error: "Payment intent not found" };
  if (intent.status !== "succeeded") {
    return { ok: false, error: `Cannot refund payment with status ${intent.status}` };
  }

  if (intent.provider === "stripe") {
    const cfg = await getPaymentConfig(tenantId);
    if (!cfg?.stripe || !intent.providerRef) {
      return { ok: false, error: "Stripe not configured or missing providerRef" };
    }
    try {
      await processStripeRefund(cfg.stripe, intent.providerRef, amountCents);
    } catch (error) {
      log.error({ error, paymentIntentId }, "Stripe refund failed");
      return { ok: false, error: error instanceof Error ? error.message : "Refund failed" };
    }
  }
  // Redsys/manual refunds: marked as refunded in DB, processed manually offline.

  await prisma.paymentIntent.update({
    where: { id: paymentIntentId },
    data: { status: "refunded", refundedAt: new Date() },
  });
  return { ok: true };
}

export interface SaveConfigInput {
  redsysEnabled?: boolean;
  redsysMerchant?: string | null;
  redsysTerminal?: string | null;
  redsysSecret?: string | null;
  redsysEnv?: "test" | "live";
  stripeEnabled?: boolean;
  stripePublicKey?: string | null;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
  allowPartialPayments?: boolean;
  depositPct?: number | null;
}

export async function savePaymentConfig(tenantId: string, input: SaveConfigInput) {
  const data: Record<string, unknown> = {};
  if (input.redsysEnabled !== undefined) data.redsysEnabled = input.redsysEnabled;
  if (input.redsysMerchant !== undefined) data.redsysMerchant = input.redsysMerchant;
  if (input.redsysTerminal !== undefined) data.redsysTerminal = input.redsysTerminal;
  if (input.redsysSecret !== undefined) {
    data.redsysSecret = input.redsysSecret ? encrypt(input.redsysSecret) : null;
  }
  if (input.redsysEnv !== undefined) data.redsysEnv = input.redsysEnv;
  if (input.stripeEnabled !== undefined) data.stripeEnabled = input.stripeEnabled;
  if (input.stripePublicKey !== undefined) data.stripePublicKey = input.stripePublicKey;
  if (input.stripeSecretKey !== undefined) {
    data.stripeSecretKey = input.stripeSecretKey ? encrypt(input.stripeSecretKey) : null;
  }
  if (input.stripeWebhookSecret !== undefined) {
    data.stripeWebhookSecret = input.stripeWebhookSecret
      ? encrypt(input.stripeWebhookSecret)
      : null;
  }
  if (input.allowPartialPayments !== undefined) {
    data.allowPartialPayments = input.allowPartialPayments;
  }
  if (input.depositPct !== undefined) data.depositPct = input.depositPct;

  return prisma.paymentConfig.upsert({
    where: { tenantId },
    update: data,
    create: { tenantId, ...data },
  });
}

export { verifyRedsysCallback, verifyStripeWebhook, generateOrderId };
export type { RedsysCallbackResult, RedsysConfig, StripeConfig };
