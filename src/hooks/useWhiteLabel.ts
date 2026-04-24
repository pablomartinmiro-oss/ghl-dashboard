"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Destination {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  country: string;
  region: string | null;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  cif: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  contactName: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TenantBranding {
  id: string;
  tenantId: string;
  businessName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  accentColor: string | null;
  tagline: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  website: string | null;
  address: string | null;
  cif: string | null;
  timezone: string;
  currency: string;
  locale: string;
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
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json();
}

// ============ DESTINATIONS ============
export function useDestinations() {
  return useQuery({
    queryKey: ["destinations"],
    queryFn: () => fetchJSON<{ destinations: Destination[] }>("/api/destinations"),
    select: (d) => d.destinations,
  });
}

export function useCreateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Destination>) =>
      fetchJSON<{ destination: Destination }>("/api/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["destinations"] }),
  });
}

export function useUpdateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Destination> & { id: string }) =>
      fetchJSON<{ destination: Destination }>(`/api/destinations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["destinations"] }),
  });
}

export function useDeleteDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/destinations/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["destinations"] }),
  });
}

// ============ SUPPLIERS ============
export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetchJSON<{ suppliers: Supplier[] }>("/api/suppliers"),
    select: (d) => d.suppliers,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Supplier>) =>
      fetchJSON<{ supplier: Supplier }>("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Supplier> & { id: string }) =>
      fetchJSON<{ supplier: Supplier }>(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

// ============ SERVICE CATEGORIES ============
export function useServiceCategories() {
  return useQuery({
    queryKey: ["service-categories"],
    queryFn: () => fetchJSON<{ categories: ServiceCategory[] }>("/api/service-categories"),
    select: (d) => d.categories,
  });
}

export function useCreateServiceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ServiceCategory>) =>
      fetchJSON<{ category: ServiceCategory }>("/api/service-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-categories"] }),
  });
}

export function useUpdateServiceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ServiceCategory> & { id: string }) =>
      fetchJSON<{ category: ServiceCategory }>(`/api/service-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-categories"] }),
  });
}

export function useDeleteServiceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/service-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-categories"] }),
  });
}

// ============ BRANDING ============
export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: () => fetchJSON<{ branding: TenantBranding | null }>("/api/branding"),
    select: (d) => d.branding,
  });
}

export function useUpsertBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TenantBranding>) =>
      fetchJSON<{ branding: TenantBranding }>("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding"] }),
  });
}

export type { Destination, Supplier, ServiceCategory, TenantBranding };
