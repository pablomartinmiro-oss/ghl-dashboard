"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Reservation {
  id: string;
  tenantId: string;
  ghlContactId: string | null;
  quoteId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  couponCode: string | null;
  source: string;
  station: string;
  activityDate: string;
  schedule: string;
  language: string;
  participants: Participant[] | null;
  services: Service[] | null;
  totalPrice: number;
  discount: number;
  paymentMethod: string | null;
  paymentRef: string | null;
  status: string;
  notes: string | null;
  internalNotes: string | null;
  emailSentAt: string | null;
  whatsappSentAt: string | null;
  notificationType: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  quote?: { id: string; clientName: string } | null;
}

export interface Participant {
  name: string;
  type: "adulto" | "infantil";
  service: string;
  level: string;
  material: boolean;
}

export interface Service {
  type: string;
  quantity: number;
  modality?: string;
  level?: string;
  days?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ReservationStats {
  today: { confirmed: number; noAvailability: number; pending: number; total: number };
  stationCapacity: Record<string, { booked: number; max: number }>;
  weekly: {
    totalReservations: number;
    totalRevenue: number;
    bySource: Record<string, number>;
    topStation: { name: string; count: number } | null;
  };
  dailyVolume: { day: string; count: number; revenue: number }[];
  recentReservations: {
    id: string; clientName: string; station: string; status: string;
    totalPrice: number; source: string; createdAt: string;
  }[];
}

export interface CapacityResult {
  station: string;
  date: string;
  capacity: Record<string, { booked: number; max: number; available: number }>;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export function useReservations(filters?: {
  status?: string;
  station?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.station) params.set("station", filters.station);
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  if (filters?.search) params.set("search", filters.search);
  const qs = params.toString();

  return useQuery({
    queryKey: ["reservations", filters],
    queryFn: () =>
      fetchJSON<{ reservations: Reservation[] }>(`/api/reservations${qs ? `?${qs}` : ""}`),
    select: (data) => data.reservations,
  });
}

export function useReservationStats() {
  return useQuery({
    queryKey: ["reservation-stats"],
    queryFn: () => fetchJSON<ReservationStats>("/api/reservations/stats"),
    refetchInterval: 30000, // Refresh every 30s for live counters
  });
}

export function useCapacity(station: string | null, date: string | null) {
  return useQuery({
    queryKey: ["capacity", station, date],
    queryFn: () =>
      fetchJSON<CapacityResult>(`/api/reservations/capacity?station=${station}&date=${date}`),
    enabled: !!station && !!date,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchJSON<{ reservation: Reservation }>("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["reservation-stats"] });
      qc.invalidateQueries({ queryKey: ["capacity"] });
    },
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      fetchJSON<{ reservation: Reservation }>(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["reservation-stats"] });
    },
  });
}

export function useDuplicateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ reservation: Reservation }>(`/api/reservations/duplicate/${id}`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["reservation-stats"] });
    },
  });
}

export function useDeleteReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/reservations/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["reservation-stats"] });
    },
  });
}

export function useCreateFromQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) =>
      fetchJSON<{ reservation: Reservation }>(`/api/reservations/from-quote/${quoteId}`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["reservation-stats"] });
    },
  });
}
