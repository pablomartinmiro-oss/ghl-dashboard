"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface WeatherDay {
  id: string;
  tenantId: string;
  destinationId: string;
  date: string;
  tempMin: number | null;
  tempMax: number | null;
  snowfall: number | null;
  windSpeed: number | null;
  conditions: string | null;
  snowDepth: number | null;
  avalancheRisk: string | null;
  fetchedAt: string;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

export function useWeather(filters?: { destinationId?: string; days?: number }) {
  const params = new URLSearchParams();
  if (filters?.destinationId) params.set("destinationId", filters.destinationId);
  if (filters?.days) params.set("days", String(filters.days));
  const qs = params.toString();
  return useQuery({
    queryKey: ["weather", filters],
    queryFn: () => fetchJSON<{ forecast: WeatherDay[] }>(`/api/weather${qs ? `?${qs}` : ""}`),
    select: (d) => d.forecast,
  });
}

export function useFetchWeather() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { destinationId?: string }) =>
      fetchJSON<{ success: boolean; destinations: number; daysFetched: number }>(
        "/api/weather/fetch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weather"] }),
  });
}
