"use client";

import { useRef, useState, useEffect } from "react";
import { Bell, CheckCheck, UserPlus, CalendarCheck, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "@/hooks/useNotifications";

const TYPE_ICON: Record<string, React.ReactNode> = {
  new_lead: <UserPlus className="h-4 w-4 text-[#E87B5A]" />,
  reservation_created: <CalendarCheck className="h-4 w-4 text-[#5B8C6D]" />,
  quote_expiring: <FileText className="h-4 w-4 text-[#D4A853]" />,
  new_opportunity: <UserPlus className="h-4 w-4 text-blue-500" />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleItemClick(n: AppNotification) {
    if (!n.isRead) markRead.mutate(n.id);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-text-secondary hover:bg-muted hover:text-text-primary transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E87B5A] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-[#E8E4DE] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E8E4DE] px-4 py-3">
            <span className="text-sm font-semibold text-[#2D2A26]">Notificaciones</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="flex items-center gap-1 text-[11px] text-[#8A8580] hover:text-[#E87B5A] transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marcar todo leído
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-0.5 hover:bg-[#FAF9F7]"
              >
                <X className="h-3.5 w-3.5 text-[#8A8580]" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-[#8A8580]">
                <Bell className="h-8 w-8 opacity-25" />
                <span>Sin notificaciones</span>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FAF9F7]",
                    !n.isRead && "bg-[#E87B5A]/5"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {TYPE_ICON[n.type] ?? <Bell className="h-4 w-4 text-[#8A8580]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        !n.isRead
                          ? "font-semibold text-[#2D2A26]"
                          : "font-medium text-[#2D2A26]"
                      )}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 truncate text-xs text-[#8A8580]">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-[#8A8580]">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#E87B5A]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
