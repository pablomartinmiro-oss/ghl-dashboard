import Link from "next/link";
import { XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ message?: string }>;
}

export default async function CheckoutErrorPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { message } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-[16px] border border-[#E8E4DE] bg-white p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#C75D4A]/15 text-[#C75D4A]">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Pago no completado</h1>
        <p className="mt-2 text-sm text-[#6E6A65]">
          {message || "Ha ocurrido un problema al procesar tu pago. Tu carrito sigue activo."}
        </p>
        <Link
          href={`/tienda/${slug}/checkout`}
          className="mt-6 inline-flex rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--brand-primary, #E87B5A)" }}
        >
          Reintentar
        </Link>
      </div>
    </div>
  );
}
