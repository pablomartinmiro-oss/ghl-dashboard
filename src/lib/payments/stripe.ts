import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "payments/stripe" });

const STRIPE_API = "https://api.stripe.com/v1";

export interface StripeConfig {
  secretKey: string;
  webhookSecret?: string;
}

export interface StripeIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export interface StripeRefundResult {
  refundId: string;
  status: string;
}

interface StripeApiError {
  error?: { message?: string; code?: string };
}

async function stripeRequest<T>(
  config: StripeConfig,
  path: string,
  body: Record<string, string>
): Promise<T> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) params.append(k, v);

  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as StripeApiError;
    throw new Error(`Stripe API error (${res.status}): ${err.error?.message ?? "unknown"}`);
  }
  return (await res.json()) as T;
}

export async function createStripePaymentIntent(
  config: StripeConfig,
  amountCents: number,
  currency: string,
  metadata: Record<string, string>
): Promise<StripeIntentResult> {
  const body: Record<string, string> = {
    amount: amountCents.toString(),
    currency: currency.toLowerCase(),
    "automatic_payment_methods[enabled]": "true",
  };
  for (const [k, v] of Object.entries(metadata)) {
    body[`metadata[${k}]`] = v;
  }

  const intent = await stripeRequest<{ id: string; client_secret: string }>(
    config,
    "/payment_intents",
    body
  );

  log.info({ paymentIntentId: intent.id, amountCents }, "Stripe PaymentIntent created");
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

export function verifyStripeWebhook(
  secret: string,
  payload: string,
  signatureHeader: string
): { valid: boolean; event: unknown } {
  try {
    const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, p) => {
      const [k, v] = p.split("=");
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});
    const timestamp = parts.t;
    const v1 = parts.v1;
    if (!timestamp || !v1) return { valid: false, event: null };

    const signedPayload = `${timestamp}.${payload}`;
    const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(v1, "hex");
    if (expectedBuf.length !== receivedBuf.length) {
      return { valid: false, event: null };
    }
    if (!timingSafeEqual(expectedBuf, receivedBuf)) {
      return { valid: false, event: null };
    }

    return { valid: true, event: JSON.parse(payload) };
  } catch (error) {
    log.error({ error }, "Stripe webhook verification failed");
    return { valid: false, event: null };
  }
}

export async function processStripeRefund(
  config: StripeConfig,
  paymentIntentId: string,
  amountCents?: number
): Promise<StripeRefundResult> {
  const body: Record<string, string> = { payment_intent: paymentIntentId };
  if (amountCents !== undefined) body.amount = amountCents.toString();

  const refund = await stripeRequest<{ id: string; status: string }>(
    config,
    "/refunds",
    body
  );

  log.info({ refundId: refund.id, paymentIntentId }, "Stripe refund processed");
  return { refundId: refund.id, status: refund.status };
}
