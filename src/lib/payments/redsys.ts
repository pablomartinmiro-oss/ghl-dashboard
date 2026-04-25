import { createCipheriv, createHmac } from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "payments/redsys" });

const REDSYS_URLS = {
  test: "https://sis-t.redsys.es:25443/sis/realizarPago",
  live: "https://sis.redsys.es/sis/realizarPago",
};
const CURRENCY_EUR = "978";
const TRANSACTION_TYPE = "0";
const SIGNATURE_VERSION = "HMAC_SHA256_V1";

export interface RedsysConfig {
  merchant: string;
  terminal: string;
  secret: string;
  env: "test" | "live";
}

export interface RedsysCreateInput {
  amountCents: number;
  orderId: string;
  description: string;
  merchantUrl: string;
  urlOk: string;
  urlKo: string;
}

export interface RedsysFormResult {
  formUrl: string;
  formParams: {
    Ds_SignatureVersion: string;
    Ds_MerchantParameters: string;
    Ds_Signature: string;
  };
}

export interface RedsysCallbackResult {
  success: boolean;
  orderId: string | null;
  authCode: string | null;
  responseCode: string | null;
}

function encrypt3DES(data: string, key: Buffer): Buffer {
  const iv = Buffer.alloc(8, 0);
  const cipher = createCipheriv("des-ede3-cbc", key, iv);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
}

function hmacSha256(data: string, key: Buffer): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

export function createRedsysPayment(
  config: RedsysConfig,
  input: RedsysCreateInput
): RedsysFormResult {
  const terminal = config.terminal.padStart(3, "0");
  const merchantParams = {
    Ds_Merchant_MerchantCode: config.merchant,
    Ds_Merchant_Terminal: terminal,
    Ds_Merchant_TransactionType: TRANSACTION_TYPE,
    Ds_Merchant_Amount: input.amountCents.toString(),
    Ds_Merchant_Currency: CURRENCY_EUR,
    Ds_Merchant_Order: input.orderId,
    Ds_Merchant_MerchantURL: input.merchantUrl,
    Ds_Merchant_UrlOK: input.urlOk,
    Ds_Merchant_UrlKO: input.urlKo,
    Ds_Merchant_ProductDescription: input.description.slice(0, 125),
  };

  const merchantParamsB64 = Buffer.from(JSON.stringify(merchantParams)).toString("base64");
  const decodedKey = Buffer.from(config.secret, "base64");
  const orderKey = encrypt3DES(input.orderId, decodedKey);
  const signature = hmacSha256(merchantParamsB64, orderKey).toString("base64");

  log.info(
    { orderId: input.orderId, amountCents: input.amountCents, env: config.env },
    "Redsys payment generated"
  );

  return {
    formUrl: REDSYS_URLS[config.env],
    formParams: {
      Ds_SignatureVersion: SIGNATURE_VERSION,
      Ds_MerchantParameters: merchantParamsB64,
      Ds_Signature: signature,
    },
  };
}

export function verifyRedsysCallback(
  config: RedsysConfig,
  params: {
    Ds_SignatureVersion?: string;
    Ds_MerchantParameters?: string;
    Ds_Signature?: string;
  }
): RedsysCallbackResult {
  if (!params.Ds_MerchantParameters || !params.Ds_Signature) {
    return { success: false, orderId: null, authCode: null, responseCode: null };
  }

  try {
    const decoded = Buffer.from(params.Ds_MerchantParameters, "base64").toString("utf8");
    const data = JSON.parse(decoded) as Record<string, string>;

    const decodedKey = Buffer.from(config.secret, "base64");
    const orderKey = encrypt3DES(data.Ds_Order ?? "", decodedKey);
    const expected = hmacSha256(params.Ds_MerchantParameters, orderKey).toString("base64");
    const received = params.Ds_Signature.replace(/-/g, "+").replace(/_/g, "/");

    if (expected !== received) {
      log.warn({ orderId: data.Ds_Order }, "Redsys signature verification failed");
      return { success: false, orderId: data.Ds_Order ?? null, authCode: null, responseCode: null };
    }

    const responseCode = data.Ds_Response ?? "9999";
    const code = parseInt(responseCode, 10);
    const success = !Number.isNaN(code) && code >= 0 && code <= 99;

    return {
      success,
      orderId: data.Ds_Order ?? null,
      authCode: data.Ds_AuthorisationCode ?? null,
      responseCode,
    };
  } catch (error) {
    log.error({ error }, "Failed to verify Redsys callback");
    return { success: false, orderId: null, authCode: null, responseCode: null };
  }
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString().slice(-4);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0; i < 8; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${timestamp}${random}`;
}
