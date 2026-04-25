"use client";

import { useState } from "react";
import { useLessons, useCreateLesson, useAutoAssign, type Lesson } from "@/hooks/useSchool";

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  group: { label: "Grupal", cls: "bg-blue-100 text-blue-700" },
  private: { label: "Particular", cls: "bg-purple-100 text-purple-700" },
  adaptive: { label: "Adaptada", cls: "bg-amber-100 text-amber-700" },
  children_group: { label: "Infantil", cls: "bg-emerald-100 text-emerald-700" },
};

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Programada", cls: "bg-zinc-100 text-zinc-700" },
  confirmed: { label: "Confirmada", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En curso", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "Completada", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelada", cls: "bg-red-100 text-red-700" },
};

export default function ClasesPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "group", date: "", startTime: "09:00", endTime: "11:00", maxStudents: 8, studentLevel: "beginner", language: "es", priceCents: 5000, destinationId: "", notes: "" });

  const { data: lessons, isLoading } = useLessons({ date });
  const create = useCreateLesson();
  const autoAssign = useAutoAssign();

  const handleAutoAssign = async () => {
    if (!form.date || !form.startTime) return;
    const created = await create.mutateAsync({ ...form, priceCents: Number(form.priceCents), maxStudents: Number(form.maxStudents) } as Partial<Lesson>);
    const res = await autoAssign.mutateAsync({ lessonId: created.lesson.id });
    if (res.instructorId && res.lesson.instructor) {
      alert(`Mejor profesor: ${res.lesson.instructor.firstName} ${res.lesson.instructor.lastName}`);
    } else {
      alert("No hay profesores disponibles");
    }
    setShowAdd(false);
  };

  const handleCreate = () => {
    create.mutate({ ...form, priceCents: Number(form.priceCents), maxStudents: Number(form.maxStudents) } as Partial<Lesson>);
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Clases</h1>
          <p className="text-sm text-text-secondary">Programación y seguimiento</p>
        </div>
        <div className="flex gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
          <button onClick={() => setShowAdd(!showAdd)} className="rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral/90">Nueva clase</button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-warm-border bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm">
              <option value="group">Grupal</option><option value="private">Particular</option><option value="adaptive">Adaptada</option><option value="children_group">Infantil</option>
            </select>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select value={form.studentLevel} onChange={(e) => setForm({ ...form, studentLevel: e.target.value })} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm">
              <option value="beginner">Debutante</option><option value="intermediate">Intermedio</option><option value="advanced">Avanzado</option><option value="expert">Experto</option>
            </select>
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm">
              <option value="es">Español</option><option value="en">Inglés</option><option value="fr">Francés</option>
            </select>
            <input type="number" placeholder="Max alumnos" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: Number(e.target.value) })} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
            <input type="number" placeholder="Precio (€)" value={form.priceCents / 100} onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) * 100 })} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAutoAssign} className="rounded-[10px] border border-warm-border px-4 py-2 text-sm hover:bg-warm-muted">🤖 Auto-asignar profesor</button>
            <button onClick={handleCreate} className="rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral/90">Crear clase</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-warm-border bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-warm-border text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
            <th className="px-4 py-3">Hora</th><th className="px-4 py-3">Profesor</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Alumnos</th><th className="px-4 py-3">Nivel</th><th className="px-4 py-3">Estado</th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">Cargando...</td></tr> :
            !lessons?.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">Sin clases para esta fecha</td></tr> :
            (lessons as Lesson[]).map((l) => {
              const tb = TYPE_BADGES[l.type] ?? { label: l.type, cls: "bg-zinc-100 text-zinc-700" };
              const sb = STATUS_BADGES[l.status] ?? { label: l.status, cls: "bg-zinc-100 text-zinc-700" };
              return (
                <tr key={l.id} className="border-b border-warm-border last:border-0">
                  <td className="px-4 py-3 font-mono">{l.startTime}–{l.endTime}</td>
                  <td className="px-4 py-3">{l.instructor ? `${l.instructor.firstName} ${l.instructor.lastName}` : "—"}</td>
                  <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${tb.cls}`}>{tb.label}</span></td>
                  <td className="px-4 py-3">{l.currentStudents}/{l.maxStudents}</td>
                  <td className="px-4 py-3 capitalize">{l.studentLevel ?? "—"}</td>
                  <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${sb.cls}`}>{sb.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
