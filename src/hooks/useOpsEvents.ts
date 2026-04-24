"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type OpsEventType =
  | "pickup"
  | "dropoff"
  | "transfer"
  | "lesson"
  | "activity"
  | "staff"
  | "maintenance"
  | "other";

export type OpsEventStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface OpsEvent {
  id: string;
  tenantId: string;
  title: string;
  type: OpsEventType;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  destinationId: string | null;
  destination?: { id: string; name: string } | null;
  supplierId: string | null;
  supplier?: { id: string; name: string } | null;
  assignedTo: string | null;
  status: OpsEventStatus;
  notes: string | null;
  color: string | null;
  reservationId: string | null;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsEventFilters {
  from?: string;
  to?: string;
  type?: string;
  destinationId?: string;
  status?: string;
}

export interface OpsEventInput {
  title: string;
  type: OpsEventType;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  allDay?: boolean;
  destinationId?: string | null;
  supplierId?: string | null;
  assignedTo?: string | null;
  status?: OpsEventStatus;
  notes?: string | null;
  color?: string | null;
  reservationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

function buildQS(filters?: OpsEventFilters): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useOpsEvents(filters?: OpsEventFilters) {
  return useQuery({
    queryKey: ["ops-events", filters],
    queryFn: () =>
      fetchJSON<{ events: OpsEvent[] }>(`/api/ops-events${buildQS(filters)}`),
    select: (d) => d.events,
  });
}

export function useOpsEvent(id: string | null) {
  return useQuery({
    queryKey: ["ops-event", id],
    queryFn: () => fetchJSON<{ event: OpsEvent }>(`/api/ops-events/${id}`),
    select: (d) => d.event,
    enabled: !!id,
  });
}

export function useCreateOpsEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpsEventInput) =>
      fetchJSON<{ event: OpsEvent }>("/api/ops-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-events"] }),
  });
}

export function useUpdateOpsEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<OpsEventInput> & { id: string }) =>
      fetchJSON<{ event: OpsEvent }>(`/api/ops-events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ops-events"] });
      qc.invalidateQueries({ queryKey: ["ops-event", vars.id] });
    },
  });
}

export function useDeleteOpsEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/ops-events/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-events"] }),
  });
}

export function useBulkCreateOpsEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (events: OpsEventInput[]) =>
      fetchJSON<{ count: number }>("/api/ops-events/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-events"] }),
  });
}
