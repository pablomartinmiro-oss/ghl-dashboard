"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useUpdateSupplier, type Supplier } from "@/hooks/useWhiteLabel";

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function SupplierPortalControls({ supplier }: { supplier: Supplier }) {
  const update = useUpdateSupplier();
  const [localPin, setLocalPin] = useState(supplier.portalPin ?? "");

  const portalUrl = useMemo(() => {
    if (typeof window === "undefined") return `/portal/${supplier.id}`;
    return `${window.location.origin}/portal/${supplier.id}`;
  }, [supplier.id]);

  async function toggleEnabled(enabled: boolean) {
    try {
      let pinToSet = supplier.portalPin;
      if (enabled && !pinToSet) {
        pinToSet = generatePin();
        setLocalPin(pinToSet);
      }
      await update.mutateAsync({
        id: supplier.id,
        portalEnabled: enabled,
        portalPin: pinToSet ?? null,
      });
      toast.success(enabled ? "Portal activado" : "Portal desactivado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar el portal");
    }
  }

  async function regeneratePin() {
    const newPin = generatePin();
    try {
      await update.mutateAsync({ id: supplier.id, portalPin: newPin });
      setLocalPin(newPin);
      toast.success("PIN regenerado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al regenerar el PIN");
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  const pinDisplay = supplier.portalPin ?? localPin;

  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-text-primary">Portal habilitado</div>
          <div className="text-xs text-text-secondary">
            Permite a {supplier.name} acceder al portal con un PIN.
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={supplier.portalEnabled}
            disabled={update.isPending}
            onChange={(e) => toggleEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border text-coral focus:ring-coral"
          />
          <span className="text-sm text-text-primary">
            {supplier.portalEnabled ? "Activo" : "Inactivo"}
          </span>
        </label>
      </div>

      {supplier.portalEnabled && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">PIN de acceso</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border bg-white px-3 py-2 font-mono text-sm tracking-widest text-text-primary">
                {pinDisplay || "——————"}
              </code>
              <button
                onClick={() => pinDisplay && copy(pinDisplay, "PIN")}
                className="rounded-lg border border-border p-2 text-text-secondary hover:bg-white hover:text-coral"
                title="Copiar PIN"
                disabled={!pinDisplay}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={regeneratePin}
                disabled={update.isPending}
                className="rounded-lg border border-border p-2 text-text-secondary hover:bg-white hover:text-coral disabled:opacity-50"
                title="Regenerar PIN"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Enlace del portal</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-border bg-white px-3 py-2 font-mono text-xs text-text-primary">
                {portalUrl}
              </code>
              <button
                onClick={() => copy(portalUrl, "Enlace")}
                className="rounded-lg border border-border p-2 text-text-secondary hover:bg-white hover:text-coral"
                title="Copiar enlace"
              >
                <Copy className="h-4 w-4" />
              </button>
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border p-2 text-text-secondary hover:bg-white hover:text-coral"
                title="Abrir"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
