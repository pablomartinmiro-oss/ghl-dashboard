"use client";

import { useState } from "react";
import { Code2, Copy, Plus, Trash2, Webhook } from "lucide-react";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useWebhookEndpoints,
  useCreateWebhook,
  useDeleteWebhook,
} from "@/hooks/useApiKeys";

const PERMISSIONS = [
  { id: "products:read", label: "Leer productos" },
  { id: "availability:read", label: "Leer disponibilidad" },
  { id: "bookings:write", label: "Crear reservas" },
  { id: "prices:read", label: "Leer precios" },
];

const WEBHOOK_EVENTS = [
  "booking.created",
  "booking.updated",
  "booking.cancelled",
  "payment.succeeded",
  "payment.failed",
  "inventory.low",
];

export default function ApiPage() {
  const { data: keys = [] } = useApiKeys();
  const { data: webhooks = [] } = useWebhookEndpoints();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);

  const togglePerm = (id: string) => {
    setNewKeyPerms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleEvent = (id: string) => {
    setNewEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleCreateKey = async () => {
    const result = await createKey.mutateAsync({
      name: newKeyName || "API Key",
      permissions: newKeyPerms,
    });
    setCreatedKey(result.key);
    setNewKeyName("");
    setNewKeyPerms([]);
  };

  const handleCreateWebhook = async () => {
    if (!newUrl) return;
    await createWebhook.mutateAsync({ url: newUrl, events: newEvents });
    setNewUrl("");
    setNewEvents([]);
    setShowCreateWebhook(false);
  };

  return (
    <div className="space-y-8 p-6">
      <header>
        <div className="flex items-center gap-2 text-sm text-[#8A8580]">
          <Code2 className="h-4 w-4" />
          <span>Integraciones</span>
        </div>
        <h1 className="mt-1 text-3xl font-semibold text-[#2D2A26]">
          API Pública
        </h1>
        <p className="mt-1 text-sm text-[#8A8580]">
          Gestiona tus claves de acceso y endpoints de webhook.
        </p>
      </header>

      <section className="rounded-2xl bg-white border border-[#E8E4DE] p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Claves de API</h2>
          <button
            onClick={() => {
              setShowCreateKey(true);
              setCreatedKey(null);
            }}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#E87B5A] hover:bg-[#D56E4F] text-white px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nueva clave
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-[#8A8580]">
            <tr className="border-b border-[#E8E4DE]">
              <th className="text-left py-2">Nombre</th>
              <th className="text-left py-2">Prefijo</th>
              <th className="text-left py-2">Creada</th>
              <th className="text-left py-2">Último uso</th>
              <th className="text-right py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#8A8580]">
                  Sin claves de API
                </td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-[#E8E4DE] last:border-0">
                <td className="py-3">
                  {k.name}
                  {!k.active && (
                    <span className="ml-2 text-xs text-[#C75D4A]">
                      (revocada)
                    </span>
                  )}
                </td>
                <td className="py-3 font-mono text-xs">{k.prefix}…</td>
                <td className="py-3 text-[#8A8580]">
                  {new Date(k.createdAt).toLocaleDateString("es-ES")}
                </td>
                <td className="py-3 text-[#8A8580]">
                  {k.lastUsedAt
                    ? new Date(k.lastUsedAt).toLocaleDateString("es-ES")
                    : "—"}
                </td>
                <td className="py-3 text-right">
                  {k.active && (
                    <button
                      onClick={() => revokeKey.mutate(k.id)}
                      className="inline-flex items-center gap-1 text-xs text-[#C75D4A] hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Revocar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl bg-white border border-[#E8E4DE] p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </h2>
          <button
            onClick={() => setShowCreateWebhook(true)}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#E87B5A] hover:bg-[#D56E4F] text-white px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Añadir endpoint
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-[#8A8580]">
            <tr className="border-b border-[#E8E4DE]">
              <th className="text-left py-2">URL</th>
              <th className="text-left py-2">Eventos</th>
              <th className="text-right py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-[#8A8580]">
                  Sin endpoints de webhook
                </td>
              </tr>
            )}
            {webhooks.map((w) => (
              <tr key={w.id} className="border-b border-[#E8E4DE] last:border-0">
                <td className="py-3 font-mono text-xs">{w.url}</td>
                <td className="py-3 text-[#8A8580]">
                  {(w.events ?? []).join(", ")}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => deleteWebhook.mutate(w.id)}
                    className="inline-flex items-center gap-1 text-xs text-[#C75D4A] hover:underline"
                  >
                    <Trash2 className="h-3 w-3" /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showCreateKey && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            {createdKey ? (
              <>
                <h3 className="text-lg font-semibold mb-2">Clave creada</h3>
                <p className="text-xs text-[#8A8580] mb-3">
                  Copia esta clave ahora. No volverá a mostrarse.
                </p>
                <div className="rounded-[10px] bg-[#FAF1ED] p-3 font-mono text-xs break-all flex items-center gap-2">
                  <span className="flex-1">{createdKey}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(createdKey)}
                  >
                    <Copy className="h-4 w-4 text-[#E87B5A]" />
                  </button>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setShowCreateKey(false);
                      setCreatedKey(null);
                    }}
                    className="rounded-[10px] bg-[#E87B5A] hover:bg-[#D56E4F] text-white px-4 py-2 text-sm font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-3">Nueva clave de API</h3>
                <label className="block text-xs text-[#8A8580] mb-1">
                  Nombre
                </label>
                <input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full rounded-[10px] border border-[#E8E4DE] px-3 py-2 text-sm mb-3"
                  placeholder="Mi integración"
                />
                <div className="text-xs text-[#8A8580] mb-2">Permisos</div>
                <div className="space-y-2 mb-4">
                  {PERMISSIONS.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={newKeyPerms.includes(p.id)}
                        onChange={() => togglePerm(p.id)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCreateKey(false)}
                    className="rounded-[10px] border border-[#E8E4DE] px-4 py-2 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateKey}
                    disabled={createKey.isPending}
                    className="rounded-[10px] bg-[#E87B5A] hover:bg-[#D56E4F] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Crear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showCreateWebhook && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Nuevo webhook</h3>
            <label className="block text-xs text-[#8A8580] mb-1">URL</label>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full rounded-[10px] border border-[#E8E4DE] px-3 py-2 text-sm mb-3"
            />
            <div className="text-xs text-[#8A8580] mb-2">Eventos</div>
            <div className="space-y-2 mb-4">
              {WEBHOOK_EVENTS.map((e) => (
                <label key={e} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newEvents.includes(e)}
                    onChange={() => toggleEvent(e)}
                  />
                  <span className="font-mono text-xs">{e}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateWebhook(false)}
                className="rounded-[10px] border border-[#E8E4DE] px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateWebhook}
                disabled={createWebhook.isPending}
                className="rounded-[10px] bg-[#E87B5A] hover:bg-[#D56E4F] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
