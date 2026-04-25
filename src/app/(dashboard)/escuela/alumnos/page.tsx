"use client";

import { useState } from "react";
import { useStudentProgress } from "@/hooks/useSchool";

const LEVEL_BADGES: Record<string, { label: string; cls: string }> = {
  beginner: { label: "Debutante", cls: "bg-emerald-100 text-emerald-700" },
  intermediate: { label: "Intermedio", cls: "bg-blue-100 text-blue-700" },
  advanced: { label: "Avanzado", cls: "bg-purple-100 text-purple-700" },
  expert: { label: "Experto", cls: "bg-coral/10 text-coral" },
};

export default function AlumnosPage() {
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const { data: progress, isLoading } = useStudentProgress(search || undefined);

  const handleSearch = () => { if (email.includes("@")) setSearch(email); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Alumnos</h1>
        <p className="text-sm text-text-secondary">Progresión y seguimiento</p>
      </div>

      <div className="flex gap-3">
        <input type="email" placeholder="Buscar por email del alumno..." value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1 rounded-[10px] border border-warm-border px-4 py-2 text-sm" />
        <button onClick={handleSearch} className="rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral/90">Buscar</button>
      </div>

      {isLoading && search && <div className="text-center text-text-secondary py-8">Buscando...</div>}

      {progress && (
        <div className="rounded-2xl border border-warm-border bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{progress.customerName}</h2>
              <p className="text-sm text-text-secondary">{progress.customerEmail}</p>
            </div>
            {progress.currentLevel && (
              <span className={`rounded-md px-3 py-1 text-sm font-medium ${LEVEL_BADGES[progress.currentLevel]?.cls ?? "bg-zinc-100 text-zinc-700"}`}>
                {LEVEL_BADGES[progress.currentLevel]?.label ?? progress.currentLevel}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-warm-border p-3 text-center">
              <div className="font-mono text-2xl font-semibold text-text-primary">{progress.totalLessons}</div>
              <div className="text-xs text-text-secondary">Clases totales</div>
            </div>
            <div className="rounded-xl border border-warm-border p-3 text-center">
              <div className="font-mono text-2xl font-semibold text-text-primary">{progress.totalHours?.toFixed(1) ?? 0}h</div>
              <div className="text-xs text-text-secondary">Horas de esquí</div>
            </div>
            <div className="rounded-xl border border-warm-border p-3 text-center">
              <div className="text-2xl font-semibold text-text-primary">{progress.achievements?.length ?? 0}</div>
              <div className="text-xs text-text-secondary">Logros</div>
            </div>
            <div className="rounded-xl border border-warm-border p-3 text-center">
              <div className="text-sm font-semibold text-text-primary">{progress.lastLessonDate ? new Date(progress.lastLessonDate).toLocaleDateString("es-ES") : "—"}</div>
              <div className="text-xs text-text-secondary">Última clase</div>
            </div>
          </div>

          {progress.achievements?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Logros</h3>
              <div className="flex flex-wrap gap-2">
                {(progress.achievements as string[]).map((a: string) => (
                  <span key={a} className="rounded-md bg-warm-gold/10 px-2 py-1 text-xs font-medium text-warm-gold">🏆 {a}</span>
                ))}
              </div>
            </div>
          )}

          {progress.notes && <p className="text-sm text-text-secondary italic">{progress.notes}</p>}
        </div>
      )}

      {search && !isLoading && !progress && (
        <div className="rounded-2xl border border-warm-border bg-white p-8 text-center text-text-secondary">
          No se encontró progreso para este email
        </div>
      )}

      {!search && (
        <div className="rounded-2xl border border-warm-border bg-white p-8 text-center text-text-secondary">
          Introduce el email de un alumno para ver su progresión
        </div>
      )}
    </div>
  );
}
