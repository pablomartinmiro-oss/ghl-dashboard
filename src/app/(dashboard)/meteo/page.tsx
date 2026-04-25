"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CloudSnow,
  Wind,
  ThermometerSun,
  Snowflake,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useWeather, useFetchWeather, type WeatherDay } from "@/hooks/useWeather";

interface Destination {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" });

const fmtTemp = (t: number | null) => (t == null ? "—" : `${Math.round(t)}°C`);

function conditionIcon(conditions: string | null) {
  if (!conditions) return CloudSnow;
  const c = conditions.toLowerCase();
  if (c.includes("nieve") || c.includes("snow")) return Snowflake;
  if (c.includes("sol") || c.includes("clear") || c.includes("despejado")) return ThermometerSun;
  return CloudSnow;
}

function alertLevel(day: WeatherDay): "ok" | "warn" | "danger" | null {
  if (day.windSpeed != null && day.windSpeed > 60) return "danger";
  if (day.snowfall != null && day.snowfall > 30) return "warn";
  if (day.tempMax != null && day.tempMax > 5) return "warn";
  return null;
}

export default function MeteoPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState<string>("");
  const fetchMutation = useFetchWeather();
  const { data: forecast = [], isLoading } = useWeather({
    destinationId: selected || undefined,
    days: 7,
  });

  useEffect(() => {
    fetch("/api/destinations")
      .then((r) => r.json())
      .then((d: { destinations: Destination[] }) => {
        setDestinations(d.destinations ?? []);
        if (d.destinations?.[0] && !selected) setSelected(d.destinations[0].id);
      })
      .catch(() => {});
  }, [selected]);

  const grouped = useMemo(() => {
    const map = new Map<string, WeatherDay[]>();
    for (const d of forecast) {
      if (!map.has(d.destinationId)) map.set(d.destinationId, []);
      map.get(d.destinationId)!.push(d);
    }
    return map;
  }, [forecast]);

  const refresh = async () => {
    await fetchMutation.mutateAsync({ destinationId: selected || undefined });
  };

  const alerts = forecast.filter((d) => alertLevel(d) === "danger" || alertLevel(d) === "warn");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Meteorología</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Pronóstico 7 días, condiciones de nieve y alertas
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Todos los destinos</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            onClick={refresh}
            disabled={fetchMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${fetchMutation.isPending ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <p className="text-sm font-medium text-amber-900">
              {alerts.length} alerta{alerts.length === 1 ? "" : "s"} meteorológica{alerts.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-warm-border bg-white p-8 text-center text-sm text-text-secondary">
          Cargando…
        </div>
      ) : forecast.length === 0 ? (
        <div className="rounded-2xl border border-warm-border bg-white p-8 text-center">
          <CloudSnow className="mx-auto mb-2 h-8 w-8 text-text-secondary" />
          <p className="text-sm text-text-secondary">
            Sin pronóstico disponible. Asegúrate de que los destinos tengan coordenadas y haz clic en Actualizar.
          </p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([destId, days]) => {
          const dest = destinations.find((d) => d.id === destId);
          return (
            <div key={destId} className="overflow-hidden rounded-2xl border border-warm-border bg-white">
              <div className="flex items-center justify-between border-b border-warm-border px-4 py-3">
                <h2 className="text-sm font-semibold text-text-primary">
                  {dest?.name ?? destId}
                </h2>
                <span className="text-xs text-text-secondary">
                  {days.length} día{days.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-7">
                {days.map((day) => {
                  const Icon = conditionIcon(day.conditions);
                  const level = alertLevel(day);
                  const ringCls =
                    level === "danger"
                      ? "ring-1 ring-red-300"
                      : level === "warn"
                        ? "ring-1 ring-amber-300"
                        : "";
                  return (
                    <div
                      key={day.id}
                      className={`rounded-2xl border border-warm-border bg-warm-muted/30 p-3 ${ringCls}`}
                    >
                      <p className="text-xs font-medium uppercase text-text-secondary">
                        {fmtDate(day.date)}
                      </p>
                      <Icon className="my-2 h-6 w-6 text-coral" />
                      <p className="text-xs text-text-secondary truncate" title={day.conditions ?? ""}>
                        {day.conditions ?? "—"}
                      </p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Máx</span>
                          <span className="font-medium text-text-primary">{fmtTemp(day.tempMax)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Mín</span>
                          <span className="font-medium text-text-primary">{fmtTemp(day.tempMin)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Nieve</span>
                          <span className="font-medium text-text-primary">
                            {day.snowfall != null ? `${Math.round(day.snowfall)} mm` : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-text-secondary">
                            <Wind className="h-3 w-3" /> Viento
                          </span>
                          <span className="font-medium text-text-primary">
                            {day.windSpeed != null ? `${Math.round(day.windSpeed)} km/h` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
