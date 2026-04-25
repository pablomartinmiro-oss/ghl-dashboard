"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type GroupType = "school" | "company" | "club" | "family" | "other";
export type GroupStatus = "inquiry" | "quoted" | "confirmed" | "in_progress" | "completed" | "cancelled";

export interface GroupBooking {
  id: string;
  tenantId: string;
  name: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string | null;
  type: GroupType;
  estimatedSize: number;
  destinationId: string | null;
  destination?: { id: string; name: string; slug: string } | null;
  startDate: string;
  endDate: string | null;
  depositCents: number | null;
  totalCents: number | null;
  discountPct: number | null;
  status: GroupStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  name: string;
  email: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  shoeSize: string | null;
  skiLevel: string | null;
  notes: string | null;
  createdAt: string;
}

export interface GroupTemplate {
  id: string;
  tenantId: string;
  name: string;
  type: GroupType;
  defaultSize: number;
  defaultDays: number;
  includesEquipment: boolean;
  includesLessons: boolean;
  discountPct: number | null;
  pricePerPersonCents: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutoSizeAssignment {
  memberId: string;
  name: string;
  heightCm: number | null;
  age: number | null;
  skiLevel: string | null;
  skiLengthCm: number | null;
  bootSize: string | null;
  helmetSize: "S" | "M" | "L" | null;
}

export interface AutoSizeResult {
  assignments: AutoSizeAssignment[];
  summary: {
    total: number;
    withSki: number;
    withBoots: number;
    withHelmet: number;
    missingHeight: number;
    missingShoe: number;
  };
}

export interface GroupsDashboard {
  totalGroups: number;
  totalMembers: number;
  upcoming: number;
  totalEstimatedPeople: number;
  pipelineValueCents: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

function qs(filters?: Record<string, string | undefined>): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useGroups(filters?: { status?: string; type?: string; search?: string }) {
  return useQuery({
    queryKey: ["groups", filters],
    queryFn: () => fetchJSON<{ groups: GroupBooking[] }>(`/api/groups${qs(filters)}`),
    select: (d) => d.groups,
  });
}

export function useGroup(id: string | null) {
  return useQuery({
    queryKey: ["group", id],
    queryFn: () => fetchJSON<{ group: GroupBooking }>(`/api/groups/${id}`),
    select: (d) => d.group,
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<GroupBooking>) =>
      fetchJSON<{ group: GroupBooking }>("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["groups-dashboard"] });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<GroupBooking> & { id: string }) =>
      fetchJSON<{ group: GroupBooking }>(`/api/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group", vars.id] });
      qc.invalidateQueries({ queryKey: ["groups-dashboard"] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["groups-dashboard"] });
    },
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, ...input }: Partial<GroupMember> & { groupId: string }) =>
      fetchJSON<{ members: GroupMember[] }>(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["group", vars.groupId] }),
  });
}

export function useDeleteGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      fetchJSON<{ success: boolean }>(`/api/groups/${groupId}/members?memberId=${memberId}`, {
        method: "DELETE",
      }),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["group", vars.groupId] }),
  });
}

export function useImportGroupMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, csv }: { groupId: string; csv: string }) =>
      fetchJSON<{ imported: number; members: GroupMember[] }>(
        `/api/groups/${groupId}/members/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv }),
        }
      ),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["group", vars.groupId] }),
  });
}

export function useAutoSizeGroup() {
  return useMutation({
    mutationFn: (groupId: string) =>
      fetchJSON<AutoSizeResult>(`/api/groups/${groupId}/auto-size`, { method: "POST" }),
  });
}

export function useGroupTemplates() {
  return useQuery({
    queryKey: ["group-templates"],
    queryFn: () => fetchJSON<{ templates: GroupTemplate[] }>("/api/groups/templates"),
    select: (d) => d.templates,
  });
}

export function useCreateGroupTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<GroupTemplate>) =>
      fetchJSON<{ template: GroupTemplate }>("/api/groups/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-templates"] }),
  });
}

export function useUpdateGroupTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<GroupTemplate> & { id: string }) =>
      fetchJSON<{ template: GroupTemplate }>(`/api/groups/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-templates"] }),
  });
}

export function useDeleteGroupTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/groups/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-templates"] }),
  });
}

export function useGroupsDashboard() {
  return useQuery({
    queryKey: ["groups-dashboard"],
    queryFn: () => fetchJSON<GroupsDashboard>("/api/groups/dashboard"),
  });
}
