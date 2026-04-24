import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal de Proveedor — Skicenter",
  description: "Portal de proveedores",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background text-text-primary">{children}</div>;
}
