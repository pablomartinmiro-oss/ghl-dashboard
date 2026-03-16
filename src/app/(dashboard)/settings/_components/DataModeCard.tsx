"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DataModeCardProps {
  dataMode: "mock" | "live";
  ghlConnected: boolean;
  loading: boolean;
  onToggle: (mode: "mock" | "live") => void;
  isPending: boolean;
}

export function DataModeCard({ dataMode, ghlConnected, loading, onToggle, isPending }: DataModeCardProps) {
  if (loading) {
    return (
      <div className="mb-6 animate-pulse rounded-lg border border-border bg-white p-6">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
      </div>
    );
  }

  const isMock = dataMode === "mock";

  return (
    <div className="mb-6 rounded-lg border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Modo de datos</h2>
          <div className="mt-1 flex items-center gap-2">
            {isMock ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Modo demo activo
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Conectado a GHL
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {isMock
              ? "Estás viendo datos de ejemplo. Conecta GoHighLevel y activa el modo real para ver tus datos."
              : "Los datos se obtienen de tu cuenta de GoHighLevel en tiempo real."}
          </p>
          {!isMock && !ghlConnected && (
            <p className="mt-1 text-sm font-medium text-red-600">
              Conecta tu cuenta de GoHighLevel primero
            </p>
          )}
        </div>

        <div className="ml-4 flex flex-col items-center gap-2">
          <Button
            variant={isMock ? "default" : "outline"}
            size="sm"
            disabled={isPending || (!ghlConnected && isMock)}
            onClick={() => onToggle(isMock ? "live" : "mock")}
            className="min-w-[140px]"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isMock ? "Activar modo real" : "Volver a demo"}
          </Button>
          {isMock && !ghlConnected && (
            <span className="text-[10px] text-muted-foreground">Conecta GHL primero</span>
          )}
        </div>
      </div>
    </div>
  );
}
