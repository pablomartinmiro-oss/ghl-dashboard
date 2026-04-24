"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface StorefrontConfig {
  id: string;
  tenantId: string;
  enabled: boolean;
  slug: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  aboutText: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  socialLinks: Record<string, string> | null;
  seoTitle: string | null;
  seoDescription: string | null;
  customCss: string | null;
  showPrices: boolean;
  allowBookings: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BookingRequestStatus =
  | "pending"
  | "contacted"
  | "quoted"
  | "confirmed"
  | "cancelled";

export interface BookingRequestRow {
  id: string;
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  productIds: string[];
  destinationId: string | null;
  startDate: string;
  endDate: string | null;
  guests: number;
  notes: string | null;
  promoCode: string | null;
  status: BookingRequestStatus;
  totalCents: number | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Fetch failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export function useStorefrontConfig() {
  return useQuery({
    queryKey: ["storefront", "config"],
    queryFn: () => fetchJSON<{ config: StorefrontConfig | null }>("/api/storefront/config"),
    select: (d) => d.config,
  });
}

export function useSaveStorefrontConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StorefrontConfig> & { slug: string }) =>
      fetchJSON<{ config: StorefrontConfig }>("/api/storefront/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storefront"] }),
  });
}

export function useBookingRequests(status?: string) {
  return useQuery({
    queryKey: ["storefront", "requests", status ?? "all"],
    queryFn: () =>
      fetchJSON<{ requests: BookingRequestRow[]; statusCounts: Record<string, number> }>(
        `/api/storefront/requests${status ? `?status=${status}` : ""}`,
      ),
  });
}

export function useUpdateBookingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      status?: BookingRequestStatus;
      notes?: string | null;
      totalCents?: number | null;
    }) => {
      const { id, ...rest } = args;
      return fetchJSON<{ request: BookingRequestRow }>(
        `/api/storefront/requests/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rest),
        },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storefront", "requests"] }),
  });
}
