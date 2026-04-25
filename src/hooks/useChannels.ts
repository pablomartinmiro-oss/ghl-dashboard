"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ChannelType = "ota" | "voucher" | "direct" | "b2b" | "marketplace";

export interface Channel {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  type: ChannelType;
  enabled: boolean;
  commissionPct: number;
  apiConfig: Record<string, unknown> | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count?: { mappings: number };
}

export interface ChannelMapping {
  id: string;
  channelId: string;
  productId: string;
  externalId: string | null;
  externalName: string | null;
  channelPrice: number | null;
  enabled: boolean;
  createdAt: string;
}

export interface ChannelBooking {
  id: string;
  tenantId: string;
  channelId: string;
  externalRef: string | null;
  customerName: string;
  customerEmail: string | null;
  productIds: string[];
  totalCents: number;
  commissionCents: number;
  status: string;
  syncedAt: string | null;
  createdAt: string;
  channel?: { id: string; name: string; slug: string } | null;
}

export interface ChannelStat {
  id: string;
  name: string;
  slug: string;
  type: ChannelType;
  enabled: boolean;
  commissionPct: number;
  lastSyncAt: string | null;
  revenueCents: number;
  commissionCents: number;
  bookings: number;
}

export interface ChannelsDashboard {
  channels: ChannelStat[];
  totalRevenueCents: number;
  totalCommissionCents: number;
  totalBookings: number;
  activeChannels: number;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

export function useChannels(filters?: { enabled?: boolean; type?: string }) {
  const params = new URLSearchParams();
  if (filters?.enabled !== undefined) params.set("enabled", String(filters.enabled));
  if (filters?.type) params.set("type", filters.type);
  const qs = params.toString();
  return useQuery({
    queryKey: ["channels", filters],
    queryFn: () => fetchJSON<{ channels: Channel[] }>(`/api/channels${qs ? `?${qs}` : ""}`),
    select: (d) => d.channels,
  });
}

export function useChannel(id: string | null) {
  return useQuery({
    queryKey: ["channel", id],
    queryFn: () => fetchJSON<{ channel: Channel & { mappings: ChannelMapping[] } }>(`/api/channels/${id}`),
    select: (d) => d.channel,
    enabled: !!id,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Channel>) =>
      fetchJSON<{ channel: Channel }>("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["channels-dashboard"] });
    },
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<Channel> & { id: string }) =>
      fetchJSON<{ channel: Channel }>(`/api/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["channel", vars.id] });
      qc.invalidateQueries({ queryKey: ["channels-dashboard"] });
    },
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/channels/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["channels-dashboard"] });
    },
  });
}

export function useChannelMappings(channelId: string | null) {
  return useQuery({
    queryKey: ["channel-mappings", channelId],
    queryFn: () =>
      fetchJSON<{ mappings: ChannelMapping[] }>(`/api/channels/${channelId}/mappings`),
    select: (d) => d.mappings,
    enabled: !!channelId,
  });
}

export function useUpsertChannelMappings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, mappings }: { channelId: string; mappings: Partial<ChannelMapping>[] }) =>
      fetchJSON<{ mappings: ChannelMapping[] }>(`/api/channels/${channelId}/mappings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["channel-mappings", vars.channelId] });
      qc.invalidateQueries({ queryKey: ["channel", vars.channelId] });
    },
  });
}

export function useSyncChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) =>
      fetchJSON<{ success: boolean; lastSyncAt: string; synced: number }>(
        `/api/channels/${channelId}/sync`,
        { method: "POST" }
      ),
    onSuccess: (_d, channelId) => {
      qc.invalidateQueries({ queryKey: ["channel", channelId] });
      qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useChannelBookings(filters?: { channelId?: string; status?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.channelId) params.set("channelId", filters.channelId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return useQuery({
    queryKey: ["channel-bookings", filters],
    queryFn: () => fetchJSON<{ bookings: ChannelBooking[] }>(`/api/channels/bookings${qs ? `?${qs}` : ""}`),
    select: (d) => d.bookings,
  });
}

export function useChannelsDashboard() {
  return useQuery({
    queryKey: ["channels-dashboard"],
    queryFn: () => fetchJSON<ChannelsDashboard>("/api/channels/dashboard"),
  });
}
