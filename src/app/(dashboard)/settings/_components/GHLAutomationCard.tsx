"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type AutomationConfig = {
  autoSyncFields: boolean;
  autoCreateOpps: boolean;
  autoSendTriggers: boolean;
  workflowBookingConfirmed: string | null;
  workflowBookingReminder: string | null;
  workflowPostTrip: string | null;
  workflowReviewRequest: string | null;
  workflowEquipmentReady: string | null;
  workflowAbandonedCart: string | null;
};

const WORKFLOW_FIELDS: Array<{ key: keyof AutomationConfig; label: string; help: string }> = [
  { key: "workflowBookingConfirmed", label: "Reserva confirmada", help: "Tras pago confirmado" },
  { key: "workflowBookingReminder", label: "Recordatorio reserva", help: "48h antes de actividad" },
  { key: "workflowPostTrip", label: "Post-viaje", help: "1 día después" },
  { key: "workflowReviewRequest", label: "Solicitud reseña", help: "3 días después" },
  { key: "workflowEquipmentReady", label: "Material listo", help: "Notificar pickup" },
  { key: "workflowAbandonedCart", label: "Carrito abandonado", help: "Presupuesto sin pagar 24h" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-coral" : "bg-warm-muted"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function GHLAutomationCard() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading } = useQuery<{ config: AutomationConfig }>({
    queryKey: ["ghl-automation"],
    queryFn: async () => {
      const res = await fetch("/api/ghl/automation");
      if (!res.ok) throw new Error("Error al cargar configuración");
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.config) setConfig(data.config);
  }, [data]);

  const save = useMutation({
    mutationFn: async (body: AutomationConfig) => {
      const res = await fetch("/api/ghl/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Error al guardar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ghl-automation"] });
      toast.success("Configuración guardada");
    },
    onError: (err) => toast.error(err.message),
  });

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/crm/pipelines");
      if (!res.ok) throw new Error("GHL no responde");
      const json = await res.json();
      const count = json.pipelines?.length ?? 0;
      toast.success(`Conexión GHL OK — ${count} pipelines`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al conectar");
    } finally {
      setTesting(false);
    }
  }

  async function syncFields() {
    if (!config?.workflowBookingConfirmed) {
      toast.error("Configura al menos un workflow ID antes de probar");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/ghl/triggers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: config.workflowBookingConfirmed,
          contactId: "test-contact",
          eventData: { test: "true" },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Fallo en sincronización");
      }
      toast.success("Endpoint de triggers operativo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  if (isLoading || !config) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-warm-muted" />
        <div className="h-10 rounded-lg bg-warm-muted" />
        <div className="h-10 rounded-lg bg-warm-muted" />
      </div>
    );
  }

  const toggleRow = (key: keyof AutomationConfig, label: string, help: string) => (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex-1">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        <div className="text-xs text-text-secondary">{help}</div>
      </div>
      <Toggle
        checked={Boolean(config[key])}
        onChange={(v) => setConfig({ ...config, [key]: v })}
      />
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-coral" />
        <h3 className="font-semibold text-text-primary">Automatización GHL</h3>
      </div>

      <div className="divide-y divide-border">
        {toggleRow("autoSyncFields", "Sincronizar campos al reservar", "Actualiza custom fields del contacto en GHL automáticamente")}
        {toggleRow("autoCreateOpps", "Crear oportunidades auto", "Crea/mueve oportunidades en el pipeline al cambiar estado")}
        {toggleRow("autoSendTriggers", "Enviar workflow triggers", "Dispara workflows GHL en eventos clave")}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-text-primary">IDs de workflows</h4>
        <p className="text-xs text-text-secondary">
          Pega el ID de cada workflow desde GHL. Déjalo en blanco para deshabilitar ese trigger.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {WORKFLOW_FIELDS.map(({ key, label, help }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-text-primary">{label}</label>
              <Input
                value={(config[key] as string | null) ?? ""}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value || null })}
                placeholder="workflow_xxxxx"
                className="font-mono text-xs"
              />
              <div className="mt-0.5 text-[11px] text-text-secondary">{help}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={testConnection} disabled={testing} className="gap-1">
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Probar conexión GHL
        </Button>
        <Button variant="outline" size="sm" onClick={syncFields} disabled={syncing} className="gap-1">
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
          Sincronizar campos custom
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => save.mutate(config)} disabled={save.isPending} className="gap-1">
          {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
