"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

interface SyncStatus {
  lastFullSync: string | null;
  lastIncrSync: string | null;
  contactCount: number;
  conversationCount: number;
  opportunityCount: number;
  pipelineCount: number;
  syncInProgress: boolean;
}

interface SyncStatusCardProps {
  ghlConnected: boolean;
  loading: boolean;
  syncStatus?: SyncStatus | null;
  syncState?: string | null;
  lastSyncError?: string | null;
}

export function SyncStatusCard({ ghlConnected, loading, syncStatus, syncState, lastSyncError }: SyncStatusCardProps) {
  const [syncing, setSyncing] = useState(false);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (!ghlConnected) {
    return null;
  }

  const lastSync = syncStatus?.lastFullSync ?? syncStatus?.lastIncrSync;
  const isError = syncState === "error";
  const isSyncing = syncStatus?.syncInProgress || syncing;

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/ghl/full-sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error de sincronización");
      }
    } finally {
      setSyncing(false);
      // Reload page to refresh sync status
      window.location.reload();
    }
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary">Sincronización GHL</h2>
            {isError ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-muted-red">
                <AlertTriangle className="h-3 w-3" />
                Error
              </span>
            ) : isSyncing ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-light px-2.5 py-0.5 text-xs font-medium text-gold">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sincronizando...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-medium text-sage">
                <CheckCircle className="h-3 w-3" />
                Conectado
              </span>
            )}
          </div>

          {isError && lastSyncError && (
            <p className="text-sm text-muted-red">{lastSyncError}</p>
          )}

          {syncStatus && (
            <div className="space-y-1 text-xs text-text-secondary">
              {lastSync && (
                <p>
                  Última sincronización:{" "}
                  <span className="font-medium text-text-primary">
                    {new Date(lastSync).toLocaleString("es-ES")}
                  </span>
                </p>
              )}
              <p>
                {syncStatus.contactCount.toLocaleString("es-ES")} contactos ·{" "}
                {syncStatus.pipelineCount} pipelines ·{" "}
                {syncStatus.opportunityCount.toLocaleString("es-ES")} oportunidades ·{" "}
                {syncStatus.conversationCount.toLocaleString("es-ES")} conversaciones
              </p>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing}
          onClick={handleManualSync}
          className="ml-4 min-w-[160px]"
        >
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sincronizar ahora
        </Button>
      </div>
    </div>
  );
}
