"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Transaction {
  id: string;
  tenantId: string;
  type: "income" | "expense" | "supplier_settlement" | "refund";
  category: "reservation" | "quote" | "groupon" | "supplier" | "operational" | "tax" | "other";
  description: string;
  amountCents: number;
  currency: string;
  date: string;
  referenceType: string | null;
  referenceId: string | null;
  supplierId: string | null;
  supplier?: { id: string; name: string } | null;
  paymentMethod: string | null;
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PnLSummary {
  incomeCents: number;
  expenseCents: number;
  grossMarginCents: number;
  grossMarginPct: number;
  transactionCount: number;
  byCategory: Record<string, { incomeCents: number; expenseCents: number }>;
  currency: string;
}

export interface SupplierSettlement {
  id: string;
  tenantId: string;
  supplierId: string;
  supplier?: { id: string; name: string } | null;
  periodStart: string;
  periodEnd: string;
  totalCents: number;
  commissionPct: number;
  commissionCents: number;
  netCents: number;
  status: "draft" | "sent" | "confirmed" | "paid";
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  type?: string;
  category?: string;
  supplierId?: string;
  status?: string;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

function buildQS(filters?: TransactionFilters): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () =>
      fetchJSON<{ transactions: Transaction[] }>(
        `/api/accounting/transactions${buildQS(filters)}`
      ),
    select: (d) => d.transactions,
  });
}

export function useAccountingSummary(filters?: Pick<TransactionFilters, "from" | "to" | "supplierId">) {
  return useQuery({
    queryKey: ["accounting-summary", filters],
    queryFn: () =>
      fetchJSON<{ summary: PnLSummary }>(`/api/accounting/summary${buildQS(filters)}`),
    select: (d) => d.summary,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Transaction>) =>
      fetchJSON<{ transaction: Transaction }>("/api/accounting/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<Transaction> & { id: string }) =>
      fetchJSON<{ transaction: Transaction }>(`/api/accounting/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/accounting/transactions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
    },
  });
}

export function useSettlements(filters?: { supplierId?: string; status?: string }) {
  return useQuery({
    queryKey: ["settlements", filters],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.supplierId) p.set("supplierId", filters.supplierId);
      if (filters?.status) p.set("status", filters.status);
      const qs = p.toString();
      return fetchJSON<{ settlements: SupplierSettlement[] }>(
        `/api/accounting/settlements${qs ? `?${qs}` : ""}`
      );
    },
    select: (d) => d.settlements,
  });
}

export function useSettlement(id: string | null) {
  return useQuery({
    queryKey: ["settlement", id],
    queryFn: () =>
      fetchJSON<{ settlement: SupplierSettlement; items: Transaction[] }>(
        `/api/accounting/settlements/${id}`
      ),
    enabled: !!id,
  });
}

export function useCreateSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      supplierId: string;
      periodStart: string;
      periodEnd: string;
      commissionPct?: number;
      notes?: string | null;
    }) =>
      fetchJSON<{ settlement: SupplierSettlement }>("/api/accounting/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settlements"] });
    },
  });
}

export function useUpdateSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<SupplierSettlement> & { id: string }) =>
      fetchJSON<{ settlement: SupplierSettlement }>(`/api/accounting/settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["settlements"] });
      qc.invalidateQueries({ queryKey: ["settlement", vars.id] });
    },
  });
}
