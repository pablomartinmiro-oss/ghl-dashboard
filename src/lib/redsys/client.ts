import { createCipheriv, createHmac } from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "redsys" });

// Redsys configuration
const REDSYS_URL = "https://sis.redsys.es/sis/realizarPago";
const CURRENCY_EUR = "978";
const TRANSACTION_TYPE = "0"; // Standard purchase
const SIGNATURE_VERSION = "HMAC_SHA256_V1";

interface RedsysFormParams {
  orderId: string; // 12 chars, unique
  amount: number; // in EUR (will multiply by 100 for cents)
  description: string;
  merchantUrl: string; // webhook URL
  urlOk: string; // success redirect
  urlKo: string; // error redirect
}

interface RedsysFormResult {
  url: string;
  params: {
    Ds_SignatureVersion: string;
    Ds_MerchantParameters: string;
    Ds_Signature: string;
  };
}

export interface RedsysResponse {
  Ds_Date: string;
  Ds_Hour: string;
  Ds_Amount: string;
  Ds_Currency: string;
  Ds_Order: string;
  Ds_MerchantCode: string;
  Ds_Terminal: string;
  Ds_Response: string;
  Ds_TransactionType: string;
  Ds_SecurePayment: string;
  Ds_AuthorisationCode: string;
  Ds_Card_Country: string;
  Ds_Card_Brand: string;
}

function getConfig() {
  const merchantCode = process.env.REDSYS_MERCHANT_CODE;
  const secretKey = process.env.REDSYS_SECRET_KEY;
  // Terminal must be zero-padded to 3 chars — Redsys requires "001" format
  const rawTerminal = process.env.REDSYS_TERMINAL ?? "1";
  const terminal = rawTerminal.padStart(3, "0");

  if (!merchantCode || !secretKey) {
    throw new Error("REDSYS_MERCHANT_CODE and REDSYS_SECRET_KEY must be set");
  }

  return { merchantCode, terminal, secretKey };
}

/**
 * Encrypt orderId with 3DES-CBC using the decoded Redsys secret key.
 * IV is 8 null bytes, PKCS5 auto-padding.
 * Returns the per-order key for HMAC signing.
 */
function encrypt3DES(data: string, key: Buffer): Buffer {
  const iv = Buffer.alloc(8, 0);
  const cipher = createCipheriv("des-ede3-cbc", key, iv);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
}

/**
 * Generate HMAC-SHA256 of data with the given key.
 */
function hmacSha256(data: string, key: Buffer): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

/**
 * Generate Redsys payment form parameters.
 * Flow:
 * 1. Build merchant params JSON, base64 encode (standard base64, NOT url-safe)
 * 2. 3DES-CBC encrypt orderId with decoded secret → per-order key
 * 3. HMAC-SHA256 the base64-encoded params with per-order key
 * 4. Base64 encode HMAC result (standard base64, NOT url-safe) = signature
 */
export function generateRedsysForm(
  params: RedsysFormParams
): RedsysFormResult {
  const { merchantCode, terminal, secretKey } = getConfig();

  // Amount MUST be integer cents — 838.70€ = 83870
  const amountCents = Math.round(params.amount * 100).toString();

  // Build merchant parameters object
  const merchantParams = {
    Ds_Merchant_MerchantCode: merchantCode,
    Ds_Merchant_Terminal: terminal,
    Ds_Merchant_TransactionType: TRANSACTION_TYPE,
    Ds_Merchant_Amount: amountCents,
    Ds_Merchant_Currency: CURRENCY_EUR,
    Ds_Merchant_Order: params.orderId,
    Ds_Merchant_MerchantURL: params.merchantUrl,
    Ds_Merchant_UrlOK: params.urlOk,
    Ds_Merchant_UrlKO: params.urlKo,
    Ds_Merchant_ProductDescription: params.description,
  };

  // Log FULL merchant params JSON BEFORE encoding for debugging
  const merchantParamsJSON = JSON.stringify(merchantParams);
  log.info(
    {
      orderId: params.orderId,
      amount: params.amount,
      amountCents,
      terminal,
      merchantParamsJSON,
    },
    "Redsys merchant params (pre-encode)"
  );

  // Standard base64 encode merchant params (NOT url-safe)
  const merchantParamsB64 = Buffer.from(merchantParamsJSON).toString("base64");

  // Decode secret key from base64
  const decodedKey = Buffer.from(secretKey, "base64");

  // 3DES encrypt orderId with decoded key → per-order signing key
  const orderKey = encrypt3DES(params.orderId, decodedKey);

  // HMAC-SHA256 the base64-encoded merchant params with per-order key
  const signature = hmacSha256(merchantParamsB64, orderKey);

  // Standard base64 encode signature (NOT url-safe)
  const signatureB64 = signature.toString("base64");

  log.info(
    {
      orderId: params.orderId,
      Ds_MerchantParameters: merchantParamsB64.slice(0, 40) + "…",
      Ds_Signature: signatureB64,
    },
    "Redsys form generated"
  );

  return {
    url: REDSYS_URL,
    params: {
      Ds_SignatureVersion: SIGNATURE_VERSION,
      Ds_MerchantParameters: merchantParamsB64,
      Ds_Signature: signatureB64,
    },
  };
}

/**
 * Verify Redsys notification signature and extract response data.
 * Redsys may send the signature in url-safe base64 — normalise before comparing.
 */
export function verifyRedsysSignature(params: {
  Ds_SignatureVersion: string;
  Ds_MerchantParameters: string;
  Ds_Signature: string;
}): { valid: boolean; data: RedsysResponse | null } {
  try {
    const { secretKey } = getConfig();

    // Decode merchant params from base64
    const decodedParams = Buffer.from(
      params.Ds_MerchantParameters,
      "base64"
    ).toString("utf8");
    const data = JSON.parse(decodedParams) as RedsysResponse;

    // Decode secret key
    const decodedKey = Buffer.from(secretKey, "base64");

    // 3DES encrypt order ID with decoded key
    const orderKey = encrypt3DES(data.Ds_Order, decodedKey);

    // HMAC-SHA256 the original base64 params
    const expectedSignature = hmacSha256(
      params.Ds_MerchantParameters,
      orderKey
    );

    // Compare: normalise received signature from url-safe base64 → standard base64
    const expectedB64 = expectedSignature.toString("base64");
    const receivedB64 = params.Ds_Signature.replace(/-/g, "+").replace(
      /_/g,
      "/"
    );

    const valid = expectedB64 === receivedB64;

    if (!valid) {
      log.warn(
        { orderId: data.Ds_Order, expected: expectedB64, received: receivedB64 },
        "Redsys signature verification failed"
      );
    }

    return { valid, data: valid ? data : null };
  } catch (error) {
    log.error({ error }, "Failed to verify Redsys signature");
    return { valid: false, data: null };
  }
}

/**
 * Generate a unique 12-character order ID for Redsys.
 * First 4 chars MUST be digits, remaining 8 are alphanumeric.
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString().slice(-4);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0; i < 8; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${timestamp}${random}`;
}
