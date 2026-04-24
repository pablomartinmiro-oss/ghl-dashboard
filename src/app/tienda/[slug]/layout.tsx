import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = await prisma.storefrontConfig.findUnique({
    where: { slug },
    select: {
      enabled: true,
      seoTitle: true,
      seoDescription: true,
      tenantId: true,
    },
  });
  if (!config || !config.enabled) {
    return { title: "Tienda no encontrada" };
  }
  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId: config.tenantId },
    select: { businessName: true, tagline: true, faviconUrl: true },
  });
  const title = config.seoTitle || branding?.businessName || "Tienda";
  const description = config.seoDescription || branding?.tagline || undefined;
  return {
    title,
    description,
    icons: branding?.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

export default async function StorefrontLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const config = await prisma.storefrontConfig.findUnique({
    where: { slug },
    select: {
      enabled: true,
      tenantId: true,
      contactEmail: true,
      contactPhone: true,
      socialLinks: true,
      customCss: true,
      allowBookings: true,
    },
  });

  if (!config || !config.enabled) {
    notFound();
  }

  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId: config.tenantId },
  });

  const primary = branding?.primaryColor || "#E87B5A";
  const secondary = branding?.secondaryColor || "#2D2A26";
  const accent = branding?.accentColor || primary;
  const businessName = branding?.businessName || "Tienda";

  const socialLinks = (config.socialLinks as Record<string, string> | null) || {};

  return (
    <div
      className="min-h-screen flex flex-col bg-[#FAF9F7] text-[#2D2A26]"
      style={{
        ["--brand-primary" as string]: primary,
        ["--brand-secondary" as string]: secondary,
        ["--brand-accent" as string]: accent,
      }}
    >
      {config.customCss && (
        <style dangerouslySetInnerHTML={{ __html: config.customCss }} />
      )}

      <header className="sticky top-0 z-30 border-b border-[#E8E4DE] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={`/tienda/${slug}`} className="flex items-center gap-2">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={businessName} className="h-8 w-auto" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white font-semibold"
                style={{ backgroundColor: primary }}
              >
                {businessName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-base font-semibold tracking-tight">
              {businessName}
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4 text-sm">
            <Link
              href={`/tienda/${slug}`}
              className="rounded-[8px] px-2.5 py-1.5 hover:bg-[#F2EFEA]"
            >
              Inicio
            </Link>
            <Link
              href={`/tienda/${slug}/productos`}
              className="rounded-[8px] px-2.5 py-1.5 hover:bg-[#F2EFEA]"
            >
              Productos
            </Link>
            {config.allowBookings && (
              <Link
                href={`/tienda/${slug}/reservar`}
                className="rounded-[10px] px-3 py-1.5 text-white"
                style={{ backgroundColor: primary }}
              >
                Reservar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer
        className="border-t border-[#E8E4DE] bg-white py-8 mt-12"
      >
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              {branding?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt={businessName} className="h-7 w-auto" />
              ) : null}
              <span className="text-base font-semibold">{businessName}</span>
            </div>
            {branding?.tagline && (
              <p className="mt-2 text-sm text-[#8A8580]">{branding.tagline}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Contacto</h3>
            <ul className="mt-2 space-y-1 text-sm text-[#6E6A65]">
              {(config.contactEmail || branding?.supportEmail) && (
                <li>
                  <a
                    href={`mailto:${config.contactEmail || branding?.supportEmail}`}
                    className="hover:underline"
                  >
                    {config.contactEmail || branding?.supportEmail}
                  </a>
                </li>
              )}
              {(config.contactPhone || branding?.supportPhone) && (
                <li>{config.contactPhone || branding?.supportPhone}</li>
              )}
              {branding?.address && <li>{branding.address}</li>}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Redes sociales</h3>
            <ul className="mt-2 space-y-1 text-sm text-[#6E6A65]">
              {Object.entries(socialLinks).map(([name, url]) =>
                url ? (
                  <li key={name}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="capitalize hover:underline"
                      style={{ color: accent }}
                    >
                      {name}
                    </a>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl px-4 text-xs text-[#8A8580] sm:px-6">
          &copy; {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
