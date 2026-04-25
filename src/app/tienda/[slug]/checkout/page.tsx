import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CheckoutPage({ params }: PageProps) {
  const { slug } = await params;
  const config = await prisma.storefrontConfig.findUnique({
    where: { slug },
    select: { enabled: true, tenantId: true },
  });
  if (!config || !config.enabled) notFound();

  const payment = await prisma.paymentConfig.findUnique({
    where: { tenantId: config.tenantId },
    select: {
      redsysEnabled: true,
      redsysMerchant: true,
      redsysSecret: true,
      stripeEnabled: true,
      stripePublicKey: true,
      stripeSecretKey: true,
      allowPartialPayments: true,
      depositPct: true,
    },
  });

  const enabledProviders: ("redsys" | "stripe" | "manual")[] = [];
  if (payment?.redsysEnabled && payment.redsysMerchant && payment.redsysSecret) {
    enabledProviders.push("redsys");
  }
  if (payment?.stripeEnabled && payment.stripeSecretKey) {
    enabledProviders.push("stripe");
  }
  enabledProviders.push("manual");

  return (
    <CheckoutForm
      slug={slug}
      enabledProviders={enabledProviders}
      stripePublicKey={payment?.stripePublicKey ?? null}
    />
  );
}
