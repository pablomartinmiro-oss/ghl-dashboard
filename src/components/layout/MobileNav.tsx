"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  MessageSquare,
  Kanban,
  Users,
  Settings,
  LayoutDashboard,
  FileText,
  Package,
  CalendarCheck,
  Wallet,
  CalendarRange,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import type { PermissionKey } from "@/types/auth";

interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: PermissionKey | null;
}

const NAV_ITEMS: MobileNavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, permission: null },
  { label: "Presupuestos", href: "/presupuestos", icon: FileText, permission: null },
  { label: "Reservas", href: "/reservas", icon: CalendarCheck, permission: null },
  { label: "Catálogo", href: "/catalogo", icon: Package, permission: null },
  { label: "Comunicaciones", href: "/comms", icon: MessageSquare, permission: "comms:view" },
  { label: "Contactos", href: "/contacts", icon: Users, permission: "contacts:view" },
  { label: "Pipeline", href: "/pipeline", icon: Kanban, permission: "pipelines:view" },
  { label: "Contabilidad", href: "/contabilidad", icon: Wallet, permission: null },
  { label: "Operaciones", href: "/operaciones", icon: CalendarRange, permission: null },
  { label: "Ajustes", href: "/settings", icon: Settings, permission: "settings:team" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === null || can(item.permission)
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          />
        }
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-sidebar-bg p-0">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-lg font-semibold text-text-primary">Skicenter</span>
        </div>
        <nav className="space-y-1 px-2 py-3">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]",
                  isActive
                    ? "border-l-[3px] border-coral bg-warm-muted text-text-primary"
                    : "text-text-secondary hover:bg-warm-muted hover:text-text-primary"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
