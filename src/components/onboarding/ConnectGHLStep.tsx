"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LinkIcon, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectGHLStepProps {
  /** From URL param ?ghl_connected=true (set by OAuth callback redirect) */
  paramConnected: boolean;
  /** Error code from URL param ?error=xxx */
  error?: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "La conexión con GoHighLevel falló. Intenta de nuevo.",
  missing_params: "Faltan parámetros en la respuesta de GHL. Intenta de nuevo.",
  invalid_state: "Estado de seguridad inválido. Intenta de nuevo.",
  invalid_tenant: "Tenant no encontrado. Cierra sesión e intenta de nuevo.",
};

export function ConnectGHLStep({ paramConnected, error }: ConnectGHLStepProps) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(paramConnected);

  // Check DB for actual GHL connection status on mount
  useEffect(() => {
    async function checkGHLStatus() {
      try {
        const res = await fetch("/api/settings/tenant");
        if (res.ok) {
          const data = await res.json();
          if (data.tenant?.ghlLocationId) {
            setIsConnected(true);
          }
        }
      } catch {
        // Ignore — fall back to param-based check
      } finally {
        setChecking(false);
      }
    }
    checkGHLStatus();
  }, []);

  function handleConnect() {
    setConnecting(true);
    window.location.href = "/api/crm/oauth/authorize";
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-light">
          <CheckCircle2 className="h-8 w-8 text-sage" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">GoHighLevel conectado</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Tu sub-cuenta de GHL está vinculada correctamente.
          </p>
        </div>
        <Button onClick={() => router.push("/onboarding/team")}>
          Continuar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral-light">
        <LinkIcon className="h-8 w-8 text-coral" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Conectar GoHighLevel</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Vincula tu sub-cuenta de GHL para sincronizar contactos,
          conversaciones y pipelines.
        </p>
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-[10px] border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{ERROR_MESSAGES[error] || `Error: ${error}`}</span>
        </div>
      )}
      <Button onClick={handleConnect} disabled={connecting} size="lg">
        {connecting ? "Redirigiendo a GHL..." : "Conectar GoHighLevel"}
      </Button>
    </div>
  );
}
