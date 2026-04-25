import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPaymentConfig, verifyRedsysCallback } from "@/lib/payments";
import { handlePaymentSucceeded } from "@/lib/payments/post-payment";

const log = logger.child({ path: "/api/checkout/pay/redsys/callback" });

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let signatureVersion: string | undefined;
    let merchantParameters: string | undefined;
    let signature: string | undefined;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      signatureVersion = body.Ds_SignatureVersion;
      merchantParameters = body.Ds_MerchantParameters;
      signature = body.Ds_Signature;
    } else {
      const form = await req.formData();
      signatureVersion = form.get("Ds_SignatureVersion")?.toString();
      merchantParameters = form.get("Ds_MerchantParameters")?.toString();
      signature = form.get("Ds_Signature")?.toString();
    }

    if (!merchantParameters || !signature) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Decode order to find the intent + tenant
    const decoded = JSON.parse(
      Buffer.from(merchantParameters, "base64").toString("utf8")
    ) as Record<string, string>;
    const orderId = decoded.Ds_Order;
    if (!orderId) {
      return NextResponse.json({ error: "Missing order" }, { status: 400 });
    }

    const intent = await prisma.paymentIntent.findFirst({
      where: { provider: "redsys", providerRef: orderId },
    });
    if (!intent) {
      log.warn({ orderId }, "Redsys callback: intent not found");
      return NextResponse.json({ error: "Intent not found" }, { status: 404 });
    }

    const config = await getPaymentConfig(intent.tenantId);
    if (!config?.redsys) {
      return NextResponse.json({ error: "Redsys not configured" }, { status: 500 });
    }

    const result = verifyRedsysCallback(config.redsys, {
      Ds_SignatureVersion: signatureVersion,
      Ds_MerchantParameters: merchantParameters,
      Ds_Signature: signature,
    });

    if (!result.success) {
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "failed",
          failedAt: new Date(),
          errorMessage: `Redsys responseCode=${result.responseCode ?? "unknown"}`,
        },
      });
      return NextResponse.json({ ok: false });
    }

    if (intent.status !== "succeeded") {
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "succeeded",
          paidAt: new Date(),
          metadata: {
            ...((intent.metadata as object) ?? {}),
            authCode: result.authCode,
          } as object,
        },
      });
      try {
        await handlePaymentSucceeded(intent.id);
      } catch (error) {
        log.error({ error, intentId: intent.id }, "Post-payment handler failed");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error({ error }, "Redsys callback failed");
    return NextResponse.json({ error: "Callback error" }, { status: 500 });
  }
}
