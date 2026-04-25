"use client";

import Link from "next/link";
import { GraduationCap, Users, Calendar, TrendingUp, Plus, UserPlus, Search } from "lucide-react";
import { useSchoolDashboard, useLessons } from "@/hooks/useSchool";

const eur = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

const LESSON_TYPE_META: Record<string, { label: string; cls: string }> = {
  group: { label: "Grupo", cls: "bg-blue-100 text-blue-800" },
  private: { label: "Particular", cls: "bg-purple-100 text-purple-800" },
  adaptive: { label: "Adaptada", cls: "bg-amber-100 text-amber-800" },
  children_group: { label: "Niños", cls: "bg-emerald-100 text-emerald-800" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Programada", cls: "bg-zinc-100 text-zinc-700" },
  confirmed: { label: "Confirmada", cls: "bg-emerald-100 text-emerald-800" },
  in_progress: { label: "En curso", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "Completada", cls: "bg-sky-100 text-sky-800" },
  cancelled: { label: "Cancelada", cls: "bg-red-100 text-red-700" },
};

export default function EscuelaPage() {
  const { data: dash, isLoading } = useSchoolDashboard();
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLessons } = useLessons({ date: today });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Escuela de Esquí
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Gestión de profesores y clases
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/escuela/profesores"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <UserPlus className="h-4 w-4" /> Profesores
          </Link>
          <Link
            href="/escuela/alumnos"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            <Search className="h-4 w-4" /> Alumnos
          </Link>
          <Link
            href="/escuela/clases"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
          >
            <Plus className="h-4 w-4" /> Nueva clase
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<GraduationCap className="h-4 w-4 text-coral" />}
          label="Profesores activos"
          value={isLoading ? "—" : String(dash?.activeInstructors ?? 0)}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4 text-coral" />}
          label="Clases hoy"
          value={isLoading ? "—" : String(dash?.lessonsToday ?? 0)}
        />
        <StatCard
          icon={<Users className="h-4 w-4 text-coral" />}
          label="Alumnos hoy"
          value={isLoading ? "—" : String(dash?.studentsToday ?? 0)}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-coral" />}
          label="Ingresos mes"
          value={isLoading ? "—" : eur(dash?.monthRevenueCents ?? 0)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <div className="flex items-center justify-between border-b border-warm-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Clases de hoy</h2>
          <Link
            href="/escuela/clases"
            className="text-xs font-medium text-coral hover:text-coral-hover"
          >
            Ver todas →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Horario</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Profesor</th>
              <th className="px-3 py-2 text-left">Destino</th>
              <th className="px-3 py-2 text-left">Alumnos</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {(todayLessons ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-text-secondary">
                  No hay clases programadas para hoy
                </td>
              </tr>
            ) : (
              todayLessons?.map((l) => {
                const type = LESSON_TYPE_META[l.type] ?? { label: l.type, cls: "bg-zinc-100 text-zinc-700" };
                const status = STATUS_META[l.status] ?? { label: l.status, cls: "bg-zinc-100 text-zinc-700" };
                return (
                  <tr key={l.id} className="hover:bg-warm-muted/30">
                    <td className="px-3 py-2.5 font-medium text-text-primary">
                      {l.startTime} – {l.endTime}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${type.cls}`}>
                        {type.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {l.instructor ? `${l.instructor.firstName} ${l.instructor.lastName}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {l.destination?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {l.currentStudents}/{l.maxStudents}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-text-primary">
                      {eur(l.priceCents)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs text-text-secondary">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}
