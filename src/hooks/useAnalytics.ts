"use client";

import { useQuery } from "@tanstack/react-query";

export interface AnalyticsOverview {
  period: { days: number; since: string };
  kpis: {
    revenueCents: number;
    expensesCents: number;
    netCents: number;
    reservations: number;
    confirmedReservations: number;
    quotes: number;
    paidQuotes: number;
    newContacts: number;
    conversionRate: number;
    avgBookingValue: number;
    quotesValue: number;
  };
}

export interface RevenueData {
  series: Array<{ date: string; cents: number }>;
  categories: Array<{ category: string; cents: number }>;
  totalCents: number;
}

export interface CustomerData {
  customers: number;
  repeatCustomers: number;
  repeatRate: number;
  avgClv: number;
  cohorts: Array<{ month: string; newCustomers: number; revenue: number }>;
  topCustomers: Array<{ email: string; bookings: number; totalSpent: number; firstBooking: string; lastBooking: string }>;
}

export interface FunnelData {
  stages: Array<{ key: string; label: string; count: number; pct: number }>;
  days: number;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export function useAnalyticsOverview(days = 30) {
  return useQuery({
    queryKey: ["analytics-overview", days],
    queryFn: () => fetchJSON<AnalyticsOverview>(`/api/analytics/overview?days=${days}`),
  });
}

export function useAnalyticsRevenue(days = 30) {
  return useQuery({
    queryKey: ["analytics-revenue", days],
    queryFn: () => fetchJSON<RevenueData>(`/api/analytics/revenue?days=${days}`),
  });
}

export function useAnalyticsCustomers() {
  return useQuery({
    queryKey: ["analytics-customers"],
    queryFn: () => fetchJSON<CustomerData>("/api/analytics/customers"),
  });
}

export function useAnalyticsFunnel(days = 30) {
  return useQuery({
    queryKey: ["analytics-funnel", days],
    queryFn: () => fetchJSON<FunnelData>(`/api/analytics/funnel?days=${days}`),
  });
}
