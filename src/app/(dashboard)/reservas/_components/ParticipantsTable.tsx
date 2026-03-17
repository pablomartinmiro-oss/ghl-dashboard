"use client";

import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { Participant } from "@/hooks/useReservations";

interface ParticipantsTableProps {
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
}

export function ParticipantsTable({ participants, onChange }: ParticipantsTableProps) {
  function updateParticipant(index: number, updates: Partial<Participant>) {
    const next = [...participants];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-text-primary">Participantes</legend>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Nombre</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Tipo</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Servicio</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Nivel</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Material</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updateParticipant(i, { name: e.target.value })}
                    className="w-full rounded border border-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-coral"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={p.type}
                    onChange={(e) => updateParticipant(i, { type: e.target.value as "adulto" | "infantil" })}
                    className="rounded border border-border bg-white px-2 py-1 text-sm"
                  >
                    <option value="adulto">Adulto</option>
                    <option value="infantil">Infantil</option>
                    <option value="baby">Baby (≤5)</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={p.service}
                    onChange={(e) => updateParticipant(i, { service: e.target.value })}
                    className="rounded border border-border bg-white px-2 py-1 text-sm"
                  >
                    <optgroup label="Cursos">
                      <option>Cursillo 3d</option>
                      <option>Cursillo 5d</option>
                      <option>Clase particular</option>
                      <option>Escuelita</option>
                    </optgroup>
                    <optgroup label="Forfait / Menú">
                      <option>Forfait</option>
                      <option>Menú bocadillo</option>
                    </optgroup>
                    <optgroup label="SnowCamp">
                      <option>SnowCamp día completo</option>
                      <option>SnowCamp mañana</option>
                      <option>SnowCamp tarde</option>
                    </optgroup>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={p.level}
                    onChange={(e) => updateParticipant(i, { level: e.target.value })}
                    className="rounded border border-border bg-white px-2 py-1 text-sm"
                  >
                    <option>Principiante</option>
                    <option>Intermedio</option>
                    <option>Avanzado</option>
                  </select>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={p.material}
                    onChange={(e) => updateParticipant(i, { material: e.target.checked })}
                    className="h-4 w-4 rounded border-border accent-coral"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {participants.length > 1 && (
                    <button
                      onClick={() => onChange(participants.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...participants, { name: "", type: "adulto", service: "Cursillo 3d", level: "Principiante", material: true }])}
        className="gap-1"
      >
        <Plus className="h-3.5 w-3.5" />
        Añadir participante
      </Button>
    </fieldset>
  );
}
