"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      fetchJSON<{ notifications: AppNotification[]; unreadCount: number }>(
        "/api/notifications"
      ),
    refetchInterval: 20_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON(`/api/notifications/${id}`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJSON("/api/notifications", { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
