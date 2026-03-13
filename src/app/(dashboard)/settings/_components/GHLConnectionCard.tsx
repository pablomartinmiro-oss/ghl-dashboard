"use client";

import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>GHL Connection</CardTitle>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
        <CardDescription>
          Manage your GoHighLevel integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>Location ID: {ghlLocationId}</span>
              </div>
              {ghlConnectedAt && (
                <div className="text-muted-foreground">
                  Connected {formatDate(ghlConnectedAt)}
                </div>
              )}
              {ghlTokenExpiry && (
                <div className="flex items-center gap-2">
                  {isTokenExpired ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  )}
                  <span>
                    Token {isTokenExpired ? "expired" : "expires"}{" "}
                    {formatDate(ghlTokenExpiry)}
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = "/api/ghl/oauth/authorize";
              }}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Reconnect
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              window.location.href = "/api/ghl/oauth/authorize";
            }}
          >
            Connect GoHighLevel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
