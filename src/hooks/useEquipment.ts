"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface EquipmentUnit {
  id: string;
  tenantId: string;
  inventoryItemId: string | null;
  serialNumber: string;
  brand: string;
  model: string;
  category: string;
  purchaseDate: string | null;
  purchaseCents: number | null;
  currentValue: number | null;
  totalRentals: number;
  condition: string;
  retiredAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count?: { waivers: number };
}

export interface DigitalWaiver {
  id: string;
  tenantId: string;
  equipmentId: string | null;
  customerName: string;
  customerEmail: string | null;
  signatureData: string | null;
  signedAt: string;
  reservationId: string | null;
  metadata: Record<string, unknown> | null;
  equipment?: { id: string; brand: string; model: string; serialNumber: string } | null;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

export function useEquipmentUnits(filters?: { condition?: string; category?: string; includeRetired?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.condition) params.set("condition", filters.condition);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.includeRetired) params.set("includeRetired", "true");
  const qs = params.toString();
  return useQuery({
    queryKey: ["equipment-units", filters],
    queryFn: () => fetchJSON<{ units: EquipmentUnit[] }>(`/api/equipment/units${qs ? `?${qs}` : ""}`),
    select: (d) => d.units,
  });
}

export function useCreateEquipmentUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<EquipmentUnit>) =>
      fetchJSON<{ unit: EquipmentUnit }>("/api/equipment/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment-units"] }),
  });
}

export function useUpdateEquipmentUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<EquipmentUnit> & { id: string; retire?: boolean }) =>
      fetchJSON<{ unit: EquipmentUnit }>(`/api/equipment/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment-units"] }),
  });
}

export function useDeleteEquipmentUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/equipment/units/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment-units"] }),
  });
}

export function useWaivers(filters?: { equipmentId?: string; reservationId?: string }) {
  const params = new URLSearchParams();
  if (filters?.equipmentId) params.set("equipmentId", filters.equipmentId);
  if (filters?.reservationId) params.set("reservationId", filters.reservationId);
  const qs = params.toString();
  return useQuery({
    queryKey: ["waivers", filters],
    queryFn: () => fetchJSON<{ waivers: DigitalWaiver[] }>(`/api/equipment/waivers${qs ? `?${qs}` : ""}`),
    select: (d) => d.waivers,
  });
}

export function useCreateWaiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DigitalWaiver>) =>
      fetchJSON<{ waiver: DigitalWaiver }>("/api/equipment/waivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["waivers"] }),
  });
}
