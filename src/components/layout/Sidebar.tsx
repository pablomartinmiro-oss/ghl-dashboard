"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Kanban,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Package,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import type { PermissionKey } from "@/types/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: PermissionKey | null;
  /** Roles allowed to see this item. Empty = all roles */
  roles?: string[];
  badge?: number;
}

// Role-based visibility:
// Owner/Manager: everything
// Sales Rep: Dashboard, Reservas, Comunicaciones, Catálogo
// VA/Admin + Marketing: permission-based filtering handles it
const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    permission: null,
  },
  {
    label: "Presupuestos",
    href: "/presupuestos",
    icon: FileText,
    permission: null,
    roles: ["Owner / Manager"],
  },
  {
    label: "Reservas",
    href: "/reservas",
    icon: CalendarCheck,
    permission: null,
  },
  {
    label: "Catálogo",
    href: "/catalogo",
    icon: Package,
    permission: null,
  },
  {
    label: "Comunicaciones",
    href: "/comms",
    icon: MessageSquare,
    permission: "comms:view",
  },
  {
    label: "Contactos",
    href: "/contacts",
    icon: Users,
    permission: "contacts:view",
    roles: ["Owner / Manager"],
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: Kanban,
    permission: "pipelines:view",
    roles: ["Owner / Manager"],
  },
  {
    label: "Ajustes",
    href: "/settings",
    icon: Settings,
    permission: "settings:team",
    roles: ["Owner / Manager"],
  },
];

interface SidebarProps {
  unreadCount?: number;
  todayReservations?: number;
}

export function Sidebar({ unreadCount = 0, todayReservations = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { can, roleName } = usePermissions();

  const visibleItems = NAV_ITEMS.filter((item) => {
    // Permission check
    if (item.permission !== null && !can(item.permission)) return false;
    // Role check: if roles defined, user's role must be in the list
    if (item.roles && item.roles.length > 0 && !item.roles.includes(roleName)) {
      return false;
    }
    return true;
  });

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-warm-border bg-sidebar-bg transition-all duration-200",
        collapsed ? "w-16" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        {!collapsed && (
          <span className="text-lg font-semibold text-text-primary">Skicenter</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-[10px] p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral",
            collapsed ? "mx-auto" : "ml-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const badgeCount =
            item.href === "/comms" ? unreadCount :
            item.href === "/reservas" ? todayReservations : 0;
          const showBadge = badgeCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-l-[3px] border-coral bg-warm-muted text-text-primary"
                  : "text-text-secondary hover:bg-warm-muted hover:text-text-primary",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <Badge
                      variant={item.href === "/reservas" ? "secondary" : "destructive"}
                      className="h-5 min-w-5 justify-center rounded-full px-1 text-xs"
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </Badge>
                  )}
                </>
              )}
              {collapsed && showBadge && (
                <span className="absolute right-1 top-0.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        {!collapsed && (
          <p className="truncate text-xs text-text-secondary">Skicenter Dashboard v1.0</p>
        )}
      </div>
    </aside>
  );
}
