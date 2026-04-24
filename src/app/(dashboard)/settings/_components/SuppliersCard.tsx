"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  type Supplier,
} from "@/hooks/useWhiteLabel";

interface FormState {
  name: string;
  slug: string;
  cif: string;
  email: string;
  phone: string;
  contactName: string;
  website: string;
  address: string;
  notes: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "", slug: "", cif: "", email: "", phone: "", contactName: "",
  website: "", address: "", notes: "", isActive: true,
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
}

export function SuppliersCard() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const del = useDeleteSupplier();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name, slug: s.slug,
      cif: s.cif ?? "", email: s.email ?? "", phone: s.phone ?? "",
      contactName: s.contactName ?? "", website: s.website ?? "",
      address: s.address ?? "", notes: s.notes ?? "", isActive: s.isActive,
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || slugify(form.name);
    const payload = {
      name: form.name.trim(),
      slug,
      cif: form.cif.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      contactName: form.contactName.trim() || null,
      website: form.website.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast.success("Proveedor actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Proveedor creado");
      }
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar proveedor");
    }
  };

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`¿Eliminar el proveedor "${s.name}"?`)) return;
    try {
      await del.mutateAsync(s.id);
      toast.success("Proveedor eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar proveedor");
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-coral" />
          <h3 className="text-lg font-semibold text-text-primary">Proveedores</h3>
          <span className="text-xs text-text-secondary">{suppliers.length}</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover transition-colors">
          <Plus className="h-4 w-4" />
          Añadir proveedor
        </button>
      </div>

      <div className="p-6 space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-lg border border-border p-4 space-y-3 bg-surface/30">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text-primary">
                {editing ? "Editar proveedor" : "Nuevo proveedor"}
              </h4>
              <button type="button" onClick={closeForm} className="text-text-secondary hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre" required>
                <input type="text" value={form.name} required
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Slug" required>
                <input type="text" value={form.slug} required
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-coral focus:outline-none" />
              </Field>
              <Field label="CIF / NIF">
                <input type="text" value={form.cif} onChange={(e) => setForm({ ...form, cif: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Persona de contacto">
                <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Teléfono">
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Web">
                <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Dirección">
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <div className="sm:col-span-2">
                <label className="block text-xs text-text-secondary mb-1">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-coral focus:ring-coral" />
                Activo
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-surface transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={create.isPending || update.isPending}
                className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50 transition-colors">
                {editing ? "Guardar" : "Crear"}
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-surface" />)}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-text-secondary">
            No hay proveedores configurados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">Nombre</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">CIF</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">Contacto</th>
                  <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-text-secondary">Activo</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-surface/30 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-text-primary">{s.name}</div>
                      <div className="text-xs text-text-secondary font-mono">{s.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{s.cif ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{s.email ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{s.contactName ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.isActive ? "bg-sage-light text-sage" : "bg-warm-muted text-text-secondary"}`}>
                        {s.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-text-secondary hover:bg-warm-muted hover:text-coral transition-colors" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(s)} className="rounded-lg p-1.5 text-text-secondary hover:bg-red-50 hover:text-danger transition-colors" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">
        {label}{required && <span className="text-coral"> *</span>}
      </label>
      {children}
    </div>
  );
}
