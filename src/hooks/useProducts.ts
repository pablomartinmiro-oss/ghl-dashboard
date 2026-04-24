"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Product {
  id: string;
  tenantId: string;
  category: string;
  name: string;
  station: string;
  description: string | null;
  personType: string | null;
  tier: string | null;
  includesHelmet: boolean;
  priceType: string;
  price: number;
  pricingMatrix: Record<string, unknown> | null;
  isActive: boolean;
  sortOrder: number;
  destinationId: string | null;
  supplierId: string | null;
  serviceCategoryId: string | null;
  destination?: { id: string; name: string; slug: string; region: string | null } | null;
  supplier?: { id: string; name: string; slug: string } | null;
  serviceCategory?: { id: string; name: string; slug: string; icon: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export function useProducts(category?: string, destination?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (destination) params.set("station", destination);
  const qs = params.toString();

  return useQuery({
    queryKey: ["products", category, destination],
    queryFn: () =>
      fetchJSON<{ products: Product[] }>(`/api/products${qs ? `?${qs}` : ""}`),
    select: (data) => data.products,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      fetchJSON<{ product: Product }>("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Product> & { id: string }) =>
      fetchJSON<{ product: Product }>(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/products/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export type { Product };
