"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Kanban,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
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
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    permission: null,
  },
  {
    label: "Comms",
    href: "/comms",
    icon: MessageSquare,
    permission: "comms:view",
  },
  {
    label: "Pipelines",
    href: "/pipelines",
    icon: Kanban,
    permission: "pipelines:view",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    permission: "analytics:view",
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: Users,
    permission: "contacts:view",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "settings:team",
  },
];

interface SidebarProps {
  unreadCount?: number;
}

export function Sidebar({ unreadCount = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === null || can(item.permission)
  );

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-sidebar-bg transition-all duration-200",
        collapsed ? "w-16" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        {!collapsed && (
          <span className="text-lg font-semibold text-text-primary">CRM Dashboard</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-lg p-1.5 text-text-secondary hover:bg-cyan-light hover:text-cyan",
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
          const showBadge =
            item.href === "/comms" && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-cyan-light text-cyan"
                  : "text-text-secondary hover:bg-cyan-light/50 hover:text-cyan",
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
                      variant="destructive"
                      className="h-5 min-w-5 justify-center rounded-full px-1 text-xs"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
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
          <p className="truncate text-xs text-text-secondary">GHL Dashboard v0.1</p>
        )}
      </div>
    </aside>
  );
}
