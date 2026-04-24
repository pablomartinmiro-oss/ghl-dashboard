"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DocType =
  | "risk_assessment"
  | "emergency_plan"
  | "safety_protocol"
  | "insurance_cert"
  | "instructor_cert"
  | "equipment_check"
  | "incident_report"
  | "other";

export type DocStatus = "draft" | "active" | "expired" | "archived";
export type DocCategory = "general" | "snow" | "mountain" | "water" | "equipment";

export type IncidentSeverity = "minor" | "moderate" | "serious" | "critical";
export type IncidentStatus = "open" | "investigating" | "resolved" | "closed";

export type RegistryStatus = "pending" | "active" | "expired" | "suspended";

export interface REAVRegistry {
  id: string;
  tenantId: string;
  registryNumber: string | null;
  communityCode: string | null;
  companyName: string;
  cif: string | null;
  registeredAt: string | null;
  expiresAt: string | null;
  status: RegistryStatus;
  insurancePolicy: string | null;
  insuranceExpiry: string | null;
  civilLiability: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyDocument {
  id: string;
  tenantId: string;
  type: DocType;
  title: string;
  description: string | null;
  fileUrl: string | null;
  validFrom: string | null;
  validUntil: string | null;
  status: DocStatus;
  category: DocCategory | null;
  assignedTo: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentReport {
  id: string;
  tenantId: string;
  date: string;
  location: string;
  destinationId: string | null;
  destination?: { id: string; name: string } | null;
  severity: IncidentSeverity;
  description: string;
  personsInvolved: string | null;
  actionsTaken: string | null;
  followUp: string | null;
  reportedBy: string;
  status: IncidentStatus;
  resolution: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface REAVDashboard {
  complianceScore: number;
  registry: REAVRegistry | null;
  registryDaysLeft: number | null;
  insuranceDaysLeft: number | null;
  documents: {
    total: number;
    active: number;
    expired: number;
    expiring: Array<{
      id: string;
      title: string;
      type: DocType;
      validUntil: string;
      daysLeft: number | null;
    }>;
  };
  required: { total: number; covered: number; missing: DocType[] };
  incidents: { open: number; critical: number };
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

// ===== Registry =====
export function useREAVRegistry() {
  return useQuery({
    queryKey: ["reav-registry"],
    queryFn: () => fetchJSON<{ registry: REAVRegistry | null }>("/api/reav/registry"),
    select: (d) => d.registry,
  });
}

export interface RegistryInput {
  registryNumber?: string | null;
  communityCode?: string | null;
  companyName: string;
  cif?: string | null;
  registeredAt?: string | null;
  expiresAt?: string | null;
  status?: RegistryStatus;
  insurancePolicy?: string | null;
  insuranceExpiry?: string | null;
  civilLiability?: number | null;
  notes?: string | null;
}

export function useUpsertREAVRegistry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegistryInput) =>
      fetchJSON<{ registry: REAVRegistry }>("/api/reav/registry", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reav-registry"] });
      qc.invalidateQueries({ queryKey: ["reav-dashboard"] });
    },
  });
}

// ===== Documents =====
export interface DocFilters {
  type?: string;
  status?: string;
  category?: string;
}

function buildQS(filters?: Record<string, string | undefined> | DocFilters | IncidentFilters): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters as Record<string, string | undefined>)) {
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useSafetyDocuments(filters?: DocFilters) {
  return useQuery({
    queryKey: ["reav-documents", filters],
    queryFn: () =>
      fetchJSON<{ documents: SafetyDocument[] }>(
        `/api/reav/documents${buildQS(filters)}`
      ),
    select: (d) => d.documents,
  });
}

export interface DocumentInput {
  type: DocType;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  status?: DocStatus;
  category?: DocCategory | null;
  assignedTo?: string | null;
}

export function useCreateSafetyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentInput) =>
      fetchJSON<{ document: SafetyDocument }>("/api/reav/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reav-documents"] });
      qc.invalidateQueries({ queryKey: ["reav-dashboard"] });
    },
  });
}

export function useUpdateSafetyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<DocumentInput> & { id: string; reviewedBy?: string | null; reviewedAt?: string | null }) =>
      fetchJSON<{ document: SafetyDocument }>(`/api/reav/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reav-documents"] });
      qc.invalidateQueries({ queryKey: ["reav-dashboard"] });
    },
  });
}

export function useDeleteSafetyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/reav/documents/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reav-documents"] });
      qc.invalidateQueries({ queryKey: ["reav-dashboard"] });
    },
  });
}

// ===== Incidents =====
export interface IncidentFilters {
  status?: string;
  severity?: string;
  destinationId?: string;
}

export function useIncidents(filters?: IncidentFilters) {
  return useQuery({
    queryKey: ["reav-incidents", filters],
    queryFn: () =>
      fetchJSON<{ incidents: IncidentReport[] }>(
        `/api/reav/incidents${buildQS(filters)}`
      ),
    select: (d) => d.incidents,
  });
}

export interface IncidentInput {
  date: string;
  location: string;
  destinationId?: string | null;
  severity: IncidentSeverity;
  description: string;
  personsInvolved?: string | null;
  actionsTaken?: string | null;
  followUp?: string | null;
  reportedBy: string;
  status?: IncidentStatus;
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IncidentInput) =>
      fetchJSON<{ incident: IncidentReport }>("/api/reav/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reav-incidents"] });
      qc.invalidateQueries({ queryKey: ["reav-dashboard"] });
    },
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<IncidentInput> & {
      id: string;
      resolution?: string | null;
      closedAt?: string | null;
    }) =>
      fetchJSON<{ incident: IncidentReport }>(`/api/reav/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reav-incidents"] });
      qc.invalidateQueries({ queryKey: ["reav-dashboard"] });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/reav/incidents/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reav-incidents"] });
      qc.invalidateQueries({ queryKey: ["reav-dashboard"] });
    },
  });
}

// ===== Dashboard =====
export function useREAVDashboard() {
  return useQuery({
    queryKey: ["reav-dashboard"],
    queryFn: () => fetchJSON<{ dashboard: REAVDashboard }>("/api/reav/dashboard"),
    select: (d) => d.dashboard,
  });
}
