import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GHL Dashboard",
  description: "Multi-tenant dashboard for GoHighLevel CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
