"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ReviewStatus = "pending" | "approved" | "rejected" | "featured";
export type ReviewSource = "email" | "storefront" | "manual" | "google";

export interface Review {
  id: string;
  customerName: string;
  customerEmail: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  destinationId: string | null;
  destination?: { id: string; name: string } | null;
  productId: string | null;
  reservationId: string | null;
  status: ReviewStatus;
  response: string | null;
  respondedAt: string | null;
  source: ReviewSource | null;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  featured: number;
  rejected: number;
  avgRating: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  byDestination: Array<{
    destinationId: string | null;
    name: string;
    count: number;
    avgRating: number;
  }>;
}

export interface ReviewRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  reservationId: string | null;
  token: string;
  sentAt: string | null;
  completedAt: string | null;
  status: "pending" | "sent" | "completed" | "expired";
  createdAt: string;
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

export function useReviews(filters?: {
  status?: string;
  rating?: string;
  destinationId?: string;
}) {
  return useQuery({
    queryKey: ["reviews", filters],
    queryFn: () =>
      fetchJSON<{ reviews: Review[] }>(`/api/reviews${buildQS(filters)}`),
    select: (d) => d.reviews,
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: ["review-stats"],
    queryFn: () => fetchJSON<ReviewStats>("/api/reviews/stats"),
  });
}

export interface ReviewInput {
  customerName: string;
  customerEmail?: string | null;
  rating: number;
  title?: string | null;
  content?: string | null;
  destinationId?: string | null;
  productId?: string | null;
  reservationId?: string | null;
  status?: ReviewStatus;
  source?: ReviewSource;
  verifiedPurchase?: boolean;
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) =>
      fetchJSON<{ review: Review }>("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["review-stats"] });
    },
  });
}

export interface ReviewUpdateInput {
  status?: ReviewStatus;
  rating?: number;
  title?: string | null;
  content?: string | null;
  response?: string | null;
  destinationId?: string | null;
  verifiedPurchase?: boolean;
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ReviewUpdateInput & { id: string }) =>
      fetchJSON<{ review: Review }>(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["review-stats"] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/reviews/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["review-stats"] });
    },
  });
}

export function useReviewRequests() {
  return useQuery({
    queryKey: ["review-requests"],
    queryFn: () =>
      fetchJSON<{ requests: ReviewRequest[] }>("/api/reviews/requests"),
    select: (d) => d.requests,
  });
}

export interface ReviewRequestInput {
  customerName: string;
  customerEmail: string;
  reservationId?: string | null;
}

export function useCreateReviewRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewRequestInput) =>
      fetchJSON<{ request: ReviewRequest }>("/api/reviews/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-requests"] });
    },
  });
}
