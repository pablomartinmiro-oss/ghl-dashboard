"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useInstructors, useCreateInstructor, type Instructor } from "@/hooks/useSchool";

const LEVEL_META: Record<string, { label: string; cls: string }> = {
  td1: { label: "TD1", cls: "bg-blue-100 text-blue-800" },
  td2: { label: "TD2", cls: "bg-purple-100 text-purple-800" },
  td3: { label: "TD3", cls: "bg-coral/20 text-coral" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Activo", cls: "bg-emerald-100 text-emerald-800" },
  inactive: { label: "Inactivo", cls: "bg-zinc-200 text-zinc-700" },
  on_leave: { label: "Baja", cls: "bg-amber-100 text-amber-800" },
};

export default function ProfesoresPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: instructors } = useInstructors({
    search: search || undefined,
    status: status || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Profesores
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Gestión de profesores de esquí
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          <Plus className="h-4 w-4" /> Añadir profesor
        </button>
      </div>

      {showForm && <InstructorForm onClose={() => setShowForm(false)} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email"
            className="w-full rounded-[10px] border border-warm-border bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="on_leave">De baja</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-warm-muted/50 text-xs font-medium text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Nivel</th>
              <th className="px-3 py-2 text-left">Idiomas</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Teléfono</th>
              <th className="px-3 py-2 text-left">Clases</th>
              <th className="px-3 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {(instructors ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-text-secondary">
                  Sin profesores para los filtros seleccionados
                </td>
              </tr>
            ) : (
              instructors?.map((p) => <InstructorRow key={p.id} instructor={p} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InstructorRow({ instructor: p }: { instructor: Instructor }) {
  const level = p.level ? LEVEL_META[p.level] : null;
  const status = STATUS_META[p.status] ?? { label: p.status, cls: "bg-zinc-100 text-zinc-700" };
  return (
    <tr className="hover:bg-warm-muted/30">
      <td className="px-3 py-2.5 font-medium text-text-primary">
        {p.firstName} {p.lastName}
      </td>
      <td className="px-3 py-2.5">
        {level ? (
          <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${level.cls}`}>
            {level.label}
          </span>
        ) : (
          <span className="text-text-secondary">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-text-secondary">
        {(p.languages ?? []).join(", ") || "—"}
      </td>
      <td className="px-3 py-2.5 text-text-secondary">{p.email ?? "—"}</td>
      <td className="px-3 py-2.5 text-text-secondary">{p.phone ?? "—"}</td>
      <td className="px-3 py-2.5 text-text-secondary">{p._count?.lessons ?? 0}</td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium ${status.cls}`}>
          {status.label}
        </span>
      </td>
    </tr>
  );
}

function InstructorForm({ onClose }: { onClose: () => void }) {
  const create = useCreateInstructor();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [languages, setLanguages] = useState("es");
  const [level, setLevel] = useState<"" | "td1" | "td2" | "td3">("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
      level: level || null,
    });
    onClose();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-warm-border bg-white p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Nuevo profesor</h3>
        <button type="button" onClick={onClose} className="rounded-[8px] p-1 text-text-secondary hover:bg-warm-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
        <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellidos" className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
        <input required value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Idiomas (es, en, fr)" className="rounded-[10px] border border-warm-border px-3 py-2 text-sm" />
        <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)} className="rounded-[10px] border border-warm-border px-3 py-2 text-sm">
          <option value="">Sin nivel</option>
          <option value="td1">TD1</option>
          <option value="td2">TD2</option>
          <option value="td3">TD3</option>
        </select>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted">
          Cancelar
        </button>
        <button type="submit" disabled={create.isPending} className="rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-60">
          {create.isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
