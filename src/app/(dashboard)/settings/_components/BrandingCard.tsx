"use client";

import { useEffect, useState } from "react";
import { Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { useBranding, useUpsertBranding } from "@/hooks/useWhiteLabel";

interface FormState {
  businessName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
  cif: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
}

const DEFAULT_FORM: FormState = {
  businessName: "Skicenter",
  tagline: "",
  supportEmail: "",
  supportPhone: "",
  website: "",
  cif: "",
  address: "",
  primaryColor: "#E87B5A",
  secondaryColor: "#5B8C6D",
};

export function BrandingCard() {
  const { data: branding, isLoading } = useBranding();
  const upsert = useUpsertBranding();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (branding) {
      setForm({
        businessName: branding.businessName,
        tagline: branding.tagline ?? "",
        supportEmail: branding.supportEmail ?? "",
        supportPhone: branding.supportPhone ?? "",
        website: branding.website ?? "",
        cif: branding.cif ?? "",
        address: branding.address ?? "",
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor ?? "#5B8C6D",
      });
    }
  }, [branding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        businessName: form.businessName.trim(),
        tagline: form.tagline.trim() || null,
        supportEmail: form.supportEmail.trim() || null,
        supportPhone: form.supportPhone.trim() || null,
        website: form.website.trim() || null,
        cif: form.cif.trim() || null,
        address: form.address.trim() || null,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
      });
      toast.success("Marca guardada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar marca");
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <Palette className="h-5 w-5 text-coral" />
        <h3 className="text-lg font-semibold text-text-primary">Marca y empresa</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 rounded-lg bg-surface" />
            <div className="h-10 rounded-lg bg-surface" />
            <div className="h-10 rounded-lg bg-surface" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre comercial" required>
                <input type="text" required value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Tagline">
                <input type="text" value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="Tu agencia de esquí en España"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Email de soporte">
                <input type="email" value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Teléfono">
                <input type="text" value={form.supportPhone}
                  onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="Web">
                <input type="text" value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://skicenter.es"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <Field label="CIF / NIF">
                <input type="text" value={form.cif}
                  onChange={(e) => setForm({ ...form, cif: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </Field>
              <div className="sm:col-span-2">
                <label className="block text-xs text-text-secondary mb-1">Dirección</label>
                <input type="text" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-coral focus:outline-none" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
              <Field label="Color primario">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="h-10 w-14 rounded-lg border border-border cursor-pointer" />
                  <input type="text" value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-coral focus:outline-none" />
                </div>
              </Field>
              <Field label="Color secundario">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="h-10 w-14 rounded-lg border border-border cursor-pointer" />
                  <input type="text" value={form.secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-coral focus:outline-none" />
                </div>
              </Field>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={upsert.isPending}
                className="flex items-center gap-2 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50 transition-colors">
                <Save className="h-4 w-4" />
                {upsert.isPending ? "Guardando…" : "Guardar marca"}
              </button>
            </div>
          </>
        )}
      </form>
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
