import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ intentId?: string; orderId?: string }>;
}

function fmt(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);
}

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { intentId, orderId } = await searchParams;

  let intent: {
    id: string;
    providerRef: string | null;
    amountCents: number;
    currency: string;
    status: string;
  } | null = null;

  if (intentId) {
    intent = await prisma.paymentIntent.findUnique({
      where: { id: intentId },
      select: { id: true, providerRef: true, amountCents: true, currency: true, status: true },
    });
  } else if (orderId) {
    intent = await prisma.paymentIntent.findFirst({
      where: { providerRef: orderId },
      select: { id: true, providerRef: true, amountCents: true, currency: true, status: true },
    });
  }

  const reference = intent?.providerRef ?? intent?.id.slice(-8).toUpperCase() ?? "—";

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-[16px] border border-[#E8E4DE] bg-white p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#5B8C6D]/15 text-[#5B8C6D]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Pago confirmado</h1>
        <p className="mt-2 text-sm text-[#6E6A65]">
          Hemos recibido tu pago correctamente.
        </p>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-[10px] border border-[#E8E4DE] px-3 py-2">
            <dt className="text-[#8A8580]">Referencia</dt>
            <dd className="font-mono">{reference}</dd>
          </div>
          {intent && (
            <div className="flex items-center justify-between rounded-[10px] border border-[#E8E4DE] px-3 py-2">
              <dt className="text-[#8A8580]">Importe</dt>
              <dd className="font-mono">{fmt(intent.amountCents, intent.currency)}</dd>
            </div>
          )}
        </dl>
        <Link
          href={`/tienda/${slug}`}
          className="mt-6 inline-flex rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--brand-primary, #E87B5A)" }}
        >
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
