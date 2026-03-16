"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface GrouponMapping {
  id: string;
  grouponDesc: string;
  pattern: string;
  services: Array<{ type: string; days?: number; quantity?: number; noHelmet?: boolean }>;
  isActive: boolean;
}

export function GrouponMappingCard() {
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [pattern, setPattern] = useState("");
  const [services, setServices] = useState<Array<{ type: string; days: number; quantity: number }>>([
    { type: "", days: 1, quantity: 1 },
  ]);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ mappings: GrouponMapping[] }>({
    queryKey: ["groupon-mappings"],
    queryFn: async () => {
      const res = await fetch("/api/settings/groupon-mappings");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMapping = useMutation({
    mutationFn: async (body: { grouponDesc: string; pattern: string; services: unknown[] }) => {
      const res = await fetch("/api/settings/groupon-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al crear mapeo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupon-mappings"] });
      toast.success("Mapeo creado");
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/groupon-mappings?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupon-mappings"] });
      toast.success("Mapeo eliminado");
    },
    onError: () => toast.error("Error al eliminar el mapeo"),
  });

  function resetForm() {
    setDesc("");
    setPattern("");
    setServices([{ type: "", days: 1, quantity: 1 }]);
    setShowForm(false);
  }

  function handleCreate() {
    if (!desc.trim() || !pattern.trim()) {
      toast.error("Completa la descripción y el patrón");
      return;
    }
    const validServices = services.filter((s) => s.type.trim());
    if (validServices.length === 0) {
      toast.error("Añade al menos un servicio");
      return;
    }
    createMapping.mutate({
      grouponDesc: desc.trim(),
      pattern: pattern.trim(),
      services: validServices,
    });
  }

  const mappings = data?.mappings ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Mapeo de productos Groupon</h2>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1" disabled={showForm}>
          <Plus className="h-3.5 w-3.5" />
          Añadir mapeo
        </Button>
      </div>

      <p className="text-sm text-text-secondary">
        Cuando el lector de cupones detecta un producto, usa estos mapeos para auto-seleccionar los servicios correspondientes.
      </p>

      {/* Add form */}
      {showForm && (
        <div className="rounded-lg border border-cyan/30 bg-cyan-light/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Nuevo mapeo</h3>
            <button onClick={resetForm} className="text-text-secondary hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Descripción Groupon</label>
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ej: Curso de esquí 1 día + equipo sin casco, adulto"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Patrón regex (para coincidencia automática)</label>
              <Input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="Ej: curso de esquí.*1 día.*con equipo.*sin casco.*1 adulto"
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Servicios Skicenter</label>
              {services.map((s, i) => (
                <div key={i} className="mt-1 flex items-center gap-2">
                  <Input
                    value={s.type}
                    onChange={(e) => {
                      const next = [...services];
                      next[i] = { ...next[i], type: e.target.value };
                      setServices(next);
                    }}
                    placeholder="Tipo (ej: cursillo_adulto)"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={s.days}
                    onChange={(e) => {
                      const next = [...services];
                      next[i] = { ...next[i], days: Number(e.target.value) };
                      setServices(next);
                    }}
                    className="w-20"
                    min={1}
                  />
                  <span className="text-xs text-text-secondary">días</span>
                  {services.length > 1 && (
                    <button
                      onClick={() => setServices(services.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setServices([...services, { type: "", days: 1, quantity: 1 }])}
                className="mt-1 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Añadir servicio
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={resetForm}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createMapping.isPending}>
              {createMapping.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Guardar mapeo
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-10 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-200" />
        </div>
      ) : mappings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-secondary">
          No hay mapeos configurados. Añade uno para que el lector de cupones auto-seleccione servicios.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Descripción Groupon</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Servicios Skicenter</th>
                <th className="w-20 px-3 py-2 text-right text-xs font-medium text-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.grouponDesc}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-text-secondary">{m.pattern}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(m.services as Array<{ type: string; days?: number }>).map((s, i) => (
                        <span key={i} className="rounded-full bg-cyan-light px-2 py-0.5 text-xs text-cyan">
                          {s.type} {s.days ? `${s.days}d` : ""}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => deleteMapping.mutate(m.id)}
                      disabled={deleteMapping.isPending}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
