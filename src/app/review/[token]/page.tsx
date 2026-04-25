import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReviewForm } from "./review-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function PublicReviewPage({ params }: PageProps) {
  const { token } = await params;

  const reviewRequest = await prisma.reviewRequest.findUnique({
    where: { token },
  });
  if (!reviewRequest) notFound();

  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId: reviewRequest.tenantId },
    select: { businessName: true, primaryColor: true, logoUrl: true },
  });

  const primary = branding?.primaryColor || "#E87B5A";
  const businessName = branding?.businessName || "Skicenter";
  const completed = reviewRequest.status === "completed";

  return (
    <main className="min-h-screen bg-[#FAF9F7] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={businessName}
              className="h-10 w-auto"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-base font-semibold text-white"
              style={{ backgroundColor: primary }}
            >
              {businessName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-lg font-semibold tracking-tight text-[#2D2A26]">
            {businessName}
          </span>
        </div>

        <div className="rounded-[16px] border border-[#E8E4DE] bg-white p-6 sm:p-8 shadow-sm">
          {completed ? (
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-3xl text-white"
                style={{ backgroundColor: primary }}
              >
                ✓
              </div>
              <h1 className="text-2xl font-semibold text-[#2D2A26]">
                Ya enviaste tu reseña
              </h1>
              <p className="mt-2 text-sm text-[#8A8580]">
                Gracias por compartir tu experiencia con nosotros.
              </p>
            </div>
          ) : (
            <ReviewForm
              token={token}
              customerName={reviewRequest.customerName}
              primaryColor={primary}
              businessName={businessName}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[#8A8580]">
          Tu opinión nos ayuda a mejorar.
        </p>
      </div>
    </main>
  );
}
