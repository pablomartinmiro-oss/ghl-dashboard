"use client";

import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface GHLConnectionCardProps {
  ghlLocationId: string | null;
  ghlConnectedAt: string | null;
  ghlTokenExpiry: string | null;
  loading: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GHLConnectionCard({
  ghlLocationId,
  ghlConnectedAt,
  ghlTokenExpiry,
  loading,
}: GHLConnectionCardProps) {
  const isConnected = !!ghlLocationId;
  const isTokenExpired = ghlTokenExpiry
    ? new Date(ghlTokenExpiry) < new Date()
    : false;

  if (loading) {
    return (
      <div className="rounded-[14px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-1 h-4 w-64" />
        <Skeleton className="mt-4 h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">GHL Connection</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isConnected ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>
      <p className="mb-4 text-sm text-text-secondary">Manage your GoHighLevel integration</p>
      {isConnected ? (
        <div className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-text-primary">Location ID: {ghlLocationId}</span>
            </div>
            {ghlConnectedAt && (
              <div className="text-text-secondary">
                Connected {formatDate(ghlConnectedAt)}
              </div>
            )}
            {ghlTokenExpiry && (
              <div className="flex items-center gap-2">
                {isTokenExpired ? (
                  <XCircle className="h-4 w-4 text-danger" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-success" />
                )}
                <span className="text-text-primary">
                  Token {isTokenExpired ? "expired" : "expires"}{" "}
                  {formatDate(ghlTokenExpiry)}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => {
              window.location.href = "/api/crm/oauth/authorize";
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reconnect
          </Button>
        </div>
      ) : (
        <Button
          className="rounded-lg bg-cyan text-white hover:bg-cyan/90"
          onClick={() => {
            window.location.href = "/api/crm/oauth/authorize";
          }}
        >
          Connect GoHighLevel
        </Button>
      )}
    </div>
  );
}
