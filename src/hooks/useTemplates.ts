"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocumentType } from "@/lib/templates/defaults";

export interface TemplateVariable {
  key: string;
  label: string;
}

export interface DocumentTemplate {
  id: string;
  tenantId: string;
  type: DocumentType;
  name: string;
  subject: string | null;
  htmlBody: string;
  variables: TemplateVariable[] | null;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  type: DocumentType;
  title: string;
  recipientEmail: string | null;
  sentAt: string | null;
  createdAt: string;
  templateId: string | null;
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

export function useDocumentTemplates(type?: DocumentType) {
  return useQuery({
    queryKey: ["document-templates", type ?? "all"],
    queryFn: () =>
      fetchJSON<{ templates: DocumentTemplate[] }>(
        `/api/templates${type ? `?type=${type}` : ""}`
      ),
    select: (d) => d.templates,
  });
}

export interface UpsertTemplateInput {
  type: DocumentType;
  name: string;
  subject?: string | null;
  htmlBody: string;
  variables?: TemplateVariable[];
  isDefault?: boolean;
  active?: boolean;
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertTemplateInput) =>
      fetchJSON<{ template: DocumentTemplate }>("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<UpsertTemplateInput>) =>
      fetchJSON<{ template: DocumentTemplate }>(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: true }>(`/api/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-templates"] }),
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data?: Record<string, unknown>;
    }) =>
      fetchJSON<{ html: string; subject: string | null }>(
        `/api/templates/${id}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: data ?? {} }),
        }
      ),
  });
}

export function useGeneratedDocuments(type?: DocumentType) {
  return useQuery({
    queryKey: ["generated-documents", type ?? "all"],
    queryFn: () =>
      fetchJSON<{ documents: GeneratedDocument[] }>(
        `/api/documents${type ? `?type=${type}` : ""}`
      ),
    select: (d) => d.documents,
  });
}

export function useGenerateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      templateId?: string;
      type?: DocumentType;
      title: string;
      data?: Record<string, unknown>;
      recipientEmail?: string | null;
      metadata?: Record<string, unknown>;
    }) =>
      fetchJSON<{ document: GeneratedDocument; subject: string | null }>(
        "/api/documents/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["generated-documents"] }),
  });
}
