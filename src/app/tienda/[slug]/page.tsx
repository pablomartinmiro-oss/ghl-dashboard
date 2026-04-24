import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

function formatEUR(value: number | null): string {
  if (value === null) return "";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function StorefrontHome({ params }: PageProps) {
  const { slug } = await params;
  const config = await prisma.storefrontConfig.findUnique({ where: { slug } });

  if (!config || !config.enabled) notFound();

  const [branding, destinations, featuredProducts] = await Promise.all([
    prisma.tenantBranding.findUnique({ where: { tenantId: config.tenantId } }),
    prisma.destination.findMany({
      where: { tenantId: config.tenantId, isActive: true },
      orderBy: { name: "asc" },
      take: 6,
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [{ tenantId: null }, { tenantId: config.tenantId }],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 6,
      include: {
        destination: { select: { name: true, slug: true } },
      },
    }),
  ]);

  const primary = branding?.primaryColor || "#E87B5A";
  const heroTitle = config.heroTitle || branding?.businessName || "Bienvenido";
  const heroSubtitle =
    config.heroSubtitle ||
    branding?.tagline ||
    "Descubre destinos de esqui y reserva tu proxima aventura.";

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: config.heroImageUrl
            ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('${config.heroImageUrl}')`
            : `linear-gradient(135deg, ${primary} 0%, ${branding?.accentColor || primary} 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 md:py-36">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            {heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/90 sm:text-lg">
            {heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/tienda/${slug}/productos`}
              className="rounded-[10px] bg-white px-5 py-2.5 text-sm font-semibold text-[#2D2A26] hover:bg-white/90"
            >
              Ver catalogo
            </Link>
            {config.allowBookings && (
              <Link
                href={`/tienda/${slug}/reservar`}
                className="rounded-[10px] border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
              >
                Solicitar reserva
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Destinations */}
      {destinations.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Destinos</h2>
              <p className="mt-1 text-sm text-[#8A8580]">
                Lugares donde operamos
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {destinations.map((d) => (
              <Link
                key={d.id}
                href={`/tienda/${slug}/productos?destinationId=${d.id}`}
                className="group rounded-[16px] border border-[#E8E4DE] bg-white p-5 transition hover:border-[color:var(--brand-primary)] hover:shadow-sm"
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] text-lg font-semibold text-white"
                  style={{ backgroundColor: primary }}
                >
                  {d.name.slice(0, 1).toUpperCase()}
                </div>
                <h3 className="text-base font-semibold">{d.name}</h3>
                {d.region && (
                  <p className="mt-0.5 text-sm text-[#8A8580]">{d.region}</p>
                )}
                <p className="mt-4 text-sm font-medium" style={{ color: primary }}>
                  Ver productos &rarr;
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Productos destacados</h2>
              <p className="mt-1 text-sm text-[#8A8580]">
                Lo mas solicitado de la temporada
              </p>
            </div>
            <Link
              href={`/tienda/${slug}/productos`}
              className="text-sm font-medium hover:underline"
              style={{ color: primary }}
            >
              Ver todos
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {featuredProducts.map((p) => (
              <div
                key={p.id}
                className="flex flex-col rounded-[16px] border border-[#E8E4DE] bg-white p-5"
              >
                <span
                  className="mb-2 self-start rounded-full border border-[#E8E4DE] px-2 py-0.5 text-xs capitalize text-[#6E6A65]"
                >
                  {p.category.replace(/_/g, " ")}
                </span>
                <h3 className="text-base font-semibold">{p.name}</h3>
                {p.description && (
                  <p className="mt-1 text-sm text-[#6E6A65] line-clamp-3">
                    {p.description}
                  </p>
                )}
                <div className="mt-auto flex items-end justify-between pt-4">
                  {config.showPrices ? (
                    <div>
                      <span className="text-lg font-semibold" style={{ color: primary }}>
                        {formatEUR(p.price)}
                      </span>
                      {p.priceType !== "fixed" && (
                        <span className="ml-1 text-xs text-[#8A8580]">
                          / {priceTypeLabel(p.priceType)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-[#8A8580]">Consultar precio</span>
                  )}
                  {config.allowBookings && (
                    <Link
                      href={`/tienda/${slug}/reservar?productId=${p.id}`}
                      className="text-sm font-medium hover:underline"
                      style={{ color: primary }}
                    >
                      Reservar
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* About + CTA */}
      {(config.aboutText || config.allowBookings) && (
        <section
          className="border-t border-[#E8E4DE] bg-white"
        >
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-2">
            {config.aboutText && (
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Sobre nosotros</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#4A4744]">
                  {config.aboutText}
                </p>
              </div>
            )}
            {config.allowBookings && (
              <div
                className="flex flex-col justify-center rounded-[16px] p-8 text-white"
                style={{ backgroundColor: primary }}
              >
                <h2 className="text-2xl font-semibold tracking-tight">
                  Listo para tu viaje?
                </h2>
                <p className="mt-2 text-sm text-white/90">
                  Solicita una reserva y un agente se pondra en contacto en menos de 24h.
                </p>
                <Link
                  href={`/tienda/${slug}/reservar`}
                  className="mt-5 inline-flex w-fit rounded-[10px] bg-white px-5 py-2.5 text-sm font-semibold text-[#2D2A26] hover:bg-white/90"
                >
                  Solicitar reserva
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function priceTypeLabel(priceType: string): string {
  switch (priceType) {
    case "per_day":
      return "dia";
    case "per_person_per_hour":
      return "persona/hora";
    case "per_session":
      return "sesion";
    default:
      return "unidad";
  }
}
