import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tu reseña — Skicenter",
  description: "Comparte tu experiencia",
};

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
