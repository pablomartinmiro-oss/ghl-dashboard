"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Mountain } from "lucide-react";

interface PortalNavProps {
  supplierId: string;
  supplierName: string | null;
}

export function PortalNav({ supplierId, supplierName }: PortalNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    localStorage.removeItem(`supplier-portal-token:${supplierId}`);
    router.replace(`/portal/${supplierId}`);
  }

  const base = `/portal/${supplierId}`;
  const links = [
    { href: `${base}/dashboard`, label: "Inicio" },
    { href: `${base}/liquidaciones`, label: "Liquidaciones" },
  ];

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-light">
            <Mountain className="h-5 w-5 text-coral" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text-primary">
              {supplierName ?? "Portal"}
            </div>
            <div className="text-xs text-text-secondary">Portal de proveedor</div>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-coral/10 text-coral"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </header>
  );
}
