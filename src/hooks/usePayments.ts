"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "cancelled";
export type PaymentProvider = "redsys" | "stripe" | "manual";

export interface Payment {
  id: string;
  tenantId: string;
  cartId: string | null;
  bookingRequestId: string | null;
  customerEmail: string;
  customerName: string;
  amountCents: number;
  currency: string;
  provider: PaymentProvider;
  providerRef: string | null;
  status: PaymentStatus;
  metadata: Record<string, unknown> | null;
  paidAt: string | null;
  failedAt: string | null;
  refundedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStats {
  revenueCents: number;
  pending: number;
  refunded: number;
  today: number;
}

export interface PaymentListResponse {
  payments: Payment[];
  pagination: { total: number; page: number; pageSize: number; pages: number };
  stats: PaymentStats;
}

export interface PaymentConfig {
  id: string | null;
  redsysEnabled: boolean;
  redsysMerchant: string | null;
  redsysTerminal: string | null;
  redsysEnv: "test" | "live";
  redsysSecretSet: boolean;
  stripeEnabled: boolean;
  stripePublicKey: string | null;
  stripeSecretKeySet: boolean;
  stripeWebhookSecretSet: boolean;
  allowPartialPayments: boolean;
  depositPct: number | null;
}

export interface PaymentConfigInput {
  redsysEnabled?: boolean;
  redsysMerchant?: string | null;
  redsysTerminal?: string | null;
  redsysSecret?: string | null;
  redsysEnv?: "test" | "live";
  stripeEnabled?: boolean;
  stripePublicKey?: string | null;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
  allowPartialPayments?: boolean;
  depositPct?: number | null;
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

export function usePayments(filters?: {
  status?: string;
  provider?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
}) {
  return useQuery({
    queryKey: ["payments", filters],
    queryFn: () =>
      fetchJSON<PaymentListResponse>(`/api/checkout/payments${buildQS(filters)}`),
  });
}

export function usePaymentConfig() {
  return useQuery({
    queryKey: ["payment-config"],
    queryFn: () =>
      fetchJSON<{ config: PaymentConfig }>("/api/checkout/config"),
    select: (d) => d.config,
  });
}

export function useUpdatePaymentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentConfigInput) =>
      fetchJSON<{ config: PaymentConfig }>("/api/checkout/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-config"] });
    },
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amountCents }: { id: string; amountCents?: number }) =>
      fetchJSON<{ payment: Payment }>(`/api/checkout/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refund", amountCents }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
