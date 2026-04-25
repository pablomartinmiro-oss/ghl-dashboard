"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ItemStatus = "available" | "reserved" | "rented" | "maintenance" | "retired";
export type ItemCondition = "new" | "good" | "fair" | "maintenance" | "retired";
export type SizeType = "length_cm" | "eu_shoe" | "head_cm" | "generic_sml";
export type ReservationStatus = "reserved" | "checked_out" | "returned" | "cancelled";
export type MaintenanceType = "tuning" | "waxing" | "repair" | "inspection" | "edge_sharpen";

export interface InventoryCategory {
  id: string;
  name: string;
  slug: string;
  sizeType: SizeType;
  sortOrder: number;
  _count?: { items: number };
}

export interface InventoryItem {
  id: string;
  categoryId: string;
  destinationId: string;
  name: string;
  brand: string | null;
  model: string | null;
  size: string;
  serialNumber: string | null;
  condition: ItemCondition;
  status: ItemStatus;
  purchaseDate: string | null;
  purchaseCents: number | null;
  seasonsPurchased: number;
  totalRentals: number;
  lastMaintenance: string | null;
  notes: string | null;
  category?: { id: string; name: string; slug: string; sizeType: SizeType };
  destination?: { id: string; name: string; slug: string };
}

export interface InventoryReservation {
  id: string;
  itemId: string;
  reservationId: string | null;
  customerName: string;
  customerEmail: string | null;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  checkedOutAt: string | null;
  returnedAt: string | null;
  damageNotes: string | null;
  item?: InventoryItem;
}

export interface MaintenanceLog {
  id: string;
  itemId: string;
  type: MaintenanceType;
  description: string | null;
  cost: number | null;
  performedBy: string | null;
  performedAt: string;
  nextDueAt: string | null;
  notes: string | null;
  item?: { id: string; name: string; size: string };
}

export interface SizingProfile {
  id: string;
  customerEmail: string;
  customerName: string;
  heightCm: number | null;
  weightKg: number | null;
  shoeSize: string | null;
  age: number | null;
  level: string | null;
  skiLength: string | null;
  bootSize: string | null;
  helmetSize: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface SizingRecommendation {
  skiLength?: string;
  bootSize?: string;
  helmetSize?: string;
  notes?: string;
}

export interface InventoryDashboard {
  total: number;
  available: number;
  reserved: number;
  rented: number;
  maintenance: number;
  retired: number;
  maintenanceDue: number;
  byDestination: Array<{ destinationId: string; name: string; count: number }>;
  byCategory: Array<{ categoryId: string; name: string; slug: string; count: number }>;
}

export interface AvailabilityResponse {
  total: number;
  availableCount: number;
  bySize: Record<string, { available: number; total: number }>;
  items: Array<{
    id: string;
    name: string;
    brand: string | null;
    size: string;
    condition: ItemCondition;
    category: InventoryItem["category"];
    destination: InventoryItem["destination"];
  }>;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

function buildQS(filters?: Record<string, string | undefined>): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

const json = { "Content-Type": "application/json" };

export function useInventoryCategories() {
  return useQuery({
    queryKey: ["inventory-categories"],
    queryFn: () =>
      fetchJSON<{ categories: InventoryCategory[] }>("/api/inventory/categories"),
    select: (d) => d.categories,
  });
}

export interface ItemFilters {
  categoryId?: string;
  destinationId?: string;
  status?: string;
  size?: string;
  search?: string;
}

export function useInventoryItems(filters?: ItemFilters) {
  return useQuery({
    queryKey: ["inventory-items", filters],
    queryFn: () =>
      fetchJSON<{ items: InventoryItem[] }>(`/api/inventory/items${buildQS(filters)}`),
    select: (d) => d.items,
  });
}

export interface CreateItemInput {
  categoryId: string;
  destinationId: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  size: string;
  serialNumber?: string | null;
  condition?: ItemCondition;
  status?: ItemStatus;
  notes?: string | null;
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateItemInput) =>
      fetchJSON<{ item: InventoryItem }>("/api/inventory/items", {
        method: "POST",
        headers: json,
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<InventoryItem> & { id: string }) =>
      fetchJSON<{ item: InventoryItem }>(`/api/inventory/items/${id}`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/inventory/items/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
  });
}

export interface BulkCreateInput {
  categoryId: string;
  destinationId: string;
  nameTemplate: string;
  brand?: string;
  model?: string;
  size: string;
  quantity: number;
  condition?: "new" | "good" | "fair";
  serialPrefix?: string;
}

export function useBulkCreateItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkCreateInput) =>
      fetchJSON<{ count: number }>("/api/inventory/items/bulk", {
        method: "POST",
        headers: json,
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
  });
}

export function useInventoryReservations(filters?: {
  itemId?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ["inventory-reservations", filters],
    queryFn: () =>
      fetchJSON<{ reservations: InventoryReservation[] }>(
        `/api/inventory/reservations${buildQS(filters)}`
      ),
    select: (d) => d.reservations,
  });
}

export interface CreateReservationInput {
  itemId: string;
  reservationId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  startDate: string;
  endDate: string;
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReservationInput) =>
      fetchJSON<{ reservation: InventoryReservation }>("/api/inventory/reservations", {
        method: "POST",
        headers: json,
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-reservations"] });
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-availability"] });
    },
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      damageNotes,
    }: {
      id: string;
      action: "checkout" | "return" | "cancel";
      damageNotes?: string | null;
    }) =>
      fetchJSON<{ reservation: InventoryReservation }>(`/api/inventory/reservations/${id}`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({ action, damageNotes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-reservations"] });
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
    },
  });
}

export function useMaintenanceLogs(itemId?: string) {
  return useQuery({
    queryKey: ["maintenance-logs", itemId],
    queryFn: () =>
      fetchJSON<{ logs: MaintenanceLog[] }>(
        `/api/inventory/maintenance${itemId ? `?itemId=${itemId}` : ""}`
      ),
    select: (d) => d.logs,
  });
}

export interface CreateMaintenanceInput {
  itemId: string;
  type: MaintenanceType;
  description?: string | null;
  cost?: number | null;
  performedBy?: string | null;
  nextDueAt?: string | null;
  notes?: string | null;
  setItemAvailable?: boolean;
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMaintenanceInput) =>
      fetchJSON<{ log: MaintenanceLog }>("/api/inventory/maintenance", {
        method: "POST",
        headers: json,
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance-logs"] });
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
  });
}

export interface AvailabilityFilters {
  startDate: string;
  endDate: string;
  destinationId?: string;
  categoryId?: string;
  size?: string;
}

export function useAvailability(filters: AvailabilityFilters | null) {
  return useQuery({
    queryKey: ["inventory-availability", filters],
    queryFn: () => fetchJSON<AvailabilityResponse>(`/api/inventory/availability${buildQS(filters!)}`),
    enabled: !!filters?.startDate && !!filters?.endDate,
  });
}

export function useSizingProfile(email?: string) {
  return useQuery({
    queryKey: ["sizing-profile", email],
    queryFn: () =>
      fetchJSON<{ profile: SizingProfile | null }>(
        `/api/inventory/sizing?email=${encodeURIComponent(email!)}`
      ),
    enabled: !!email,
    select: (d) => d.profile,
  });
}

export function useSizingProfiles() {
  return useQuery({
    queryKey: ["sizing-profiles"],
    queryFn: () =>
      fetchJSON<{ profiles: SizingProfile[] }>("/api/inventory/sizing"),
    select: (d) => d.profiles,
  });
}

export interface UpsertSizingInput {
  customerEmail: string;
  customerName: string;
  heightCm?: number | null;
  weightKg?: number | null;
  shoeSize?: string | null;
  age?: number | null;
  level?: string | null;
  skiLength?: string | null;
  bootSize?: string | null;
  helmetSize?: string | null;
  notes?: string | null;
}

export function useUpsertSizing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertSizingInput) =>
      fetchJSON<{ profile: SizingProfile }>("/api/inventory/sizing", {
        method: "PUT",
        headers: json,
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sizing-profile"] });
      qc.invalidateQueries({ queryKey: ["sizing-profiles"] });
    },
  });
}

export function useSizingRecommend() {
  return useMutation({
    mutationFn: (input: {
      heightCm?: number | null;
      weightKg?: number | null;
      age?: number | null;
      level?: string | null;
      shoeSize?: string | null;
      headCm?: number | null;
    }) =>
      fetchJSON<{ recommendation: SizingRecommendation }>(
        "/api/inventory/sizing/recommend",
        { method: "POST", headers: json, body: JSON.stringify(input) }
      ),
  });
}

export function useInventoryDashboard() {
  return useQuery({
    queryKey: ["inventory-dashboard"],
    queryFn: () => fetchJSON<InventoryDashboard>("/api/inventory/dashboard"),
  });
}
