"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Copy, Eye, EyeOff } from "lucide-react";
import {
  useStorefrontConfig,
  useSaveStorefrontConfig,
  type StorefrontConfig,
} from "@/hooks/useStorefront";

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

const input =
  "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary focus:border-coral focus:outline-none";

export function ConfigForm() {
  const { data: config, isLoading } = useStorefrontConfig();
  const save = useSaveStorefrontConfig();

  const [form, setForm] = useState<Partial<StorefrontConfig>>({
    slug: "",
    enabled: false,
    showPrices: true,
    allowBookings: true,
  });

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const update = <K extends keyof StorefrontConfig>(key: K, value: StorefrontConfig[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = (form.slug || "").trim();
    if (!SLUG_REGEX.test(slug)) {
      toast.error("Slug: letras minusculas, numeros y guiones (2-60 caracteres)");
      return;
    }
    try {
      await save.mutateAsync({ ...form, slug });
      toast.success("Configuracion guardada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  const publicUrl =
    typeof window !== "undefined" && form.slug ? `${window.location.origin}/tienda/${form.slug}` : "";

  function copyLink() {
    if (!publicUrl) return;
    void navigator.clipboard.writeText(publicUrl).then(() => toast.success("Enlace copiado"));
  }

  if (isLoading) {
    return <div className="text-sm text-text-secondary">Cargando...</div>;
  }

  const social = (form.socialLinks as Record<string, string> | null) || {};

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Top bar: enabled + link */}
      <div className="flex flex-col gap-3 rounded-[16px] border border-warm-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {form.enabled ? (
              <Eye className="h-4 w-4 text-sage" />
            ) : (
              <EyeOff className="h-4 w-4 text-text-secondary" />
            )}
            <span className="text-sm font-medium">
              {form.enabled ? "Tienda publicada" : "Tienda desactivada"}
            </span>
          </div>
          {form.slug ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
              <code className="truncate">{publicUrl}</code>
              <button
                type="button"
                onClick={copyLink}
                className="rounded-[6px] p-1 hover:bg-warm-muted"
                aria-label="Copiar enlace"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {form.enabled && publicUrl && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[6px] p-1 hover:bg-warm-muted"
                  aria-label="Abrir tienda"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ) : null}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.enabled}
            onChange={(e) => update("enabled", e.target.checked)}
            className="h-4 w-4 rounded border-warm-border accent-coral"
          />
          Tienda activa
        </label>
      </div>

      {/* Basic */}
      <Section title="Identidad y URL">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slug publico *" hint="Se usa en /tienda/{slug}">
            <input
              type="text"
              value={form.slug || ""}
              onChange={(e) => update("slug", e.target.value.toLowerCase())}
              className={input}
              placeholder="skicenter"
            />
          </Field>
          <Field label="SEO Titulo">
            <input
              type="text"
              value={form.seoTitle || ""}
              onChange={(e) => update("seoTitle", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="SEO Descripcion" span={2}>
            <input
              type="text"
              value={form.seoDescription || ""}
              onChange={(e) => update("seoDescription", e.target.value)}
              className={input}
            />
          </Field>
        </div>
      </Section>

      {/* Hero */}
      <Section title="Seccion principal (hero)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titulo hero">
            <input
              type="text"
              value={form.heroTitle || ""}
              onChange={(e) => update("heroTitle", e.target.value)}
              className={input}
              placeholder="Vive la montana"
            />
          </Field>
          <Field label="Subtitulo hero">
            <input
              type="text"
              value={form.heroSubtitle || ""}
              onChange={(e) => update("heroSubtitle", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="URL imagen hero" span={2}>
            <input
              type="url"
              value={form.heroImageUrl || ""}
              onChange={(e) => update("heroImageUrl", e.target.value)}
              className={input}
              placeholder="https://..."
            />
          </Field>
        </div>
      </Section>

      {/* About + contact */}
      <Section title="Sobre nosotros y contacto">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Texto descriptivo" span={2}>
            <textarea
              rows={4}
              value={form.aboutText || ""}
              onChange={(e) => update("aboutText", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Email de contacto">
            <input
              type="email"
              value={form.contactEmail || ""}
              onChange={(e) => update("contactEmail", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Telefono de contacto">
            <input
              type="tel"
              value={form.contactPhone || ""}
              onChange={(e) => update("contactPhone", e.target.value)}
              className={input}
            />
          </Field>
        </div>
      </Section>

      {/* Social */}
      <Section title="Redes sociales">
        <div className="grid gap-3 sm:grid-cols-3">
          {["instagram", "facebook", "tiktok"].map((k) => (
            <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
              <input
                type="url"
                value={social[k] || ""}
                onChange={(e) =>
                  update("socialLinks", { ...social, [k]: e.target.value })
                }
                className={input}
                placeholder="https://..."
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* Flags */}
      <Section title="Opciones">
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Mostrar precios"
            checked={!!form.showPrices}
            onChange={(v) => update("showPrices", v)}
            hint="Desactivar si prefieres que el cliente consulte precios."
          />
          <Toggle
            label="Permitir solicitudes de reserva"
            checked={!!form.allowBookings}
            onChange={(v) => update("allowBookings", v)}
            hint="Si esta desactivado, se oculta el formulario de reserva."
          />
        </div>
      </Section>

      {/* Custom CSS */}
      <Section title="CSS personalizado (avanzado)">
        <textarea
          rows={5}
          value={form.customCss || ""}
          onChange={(e) => update("customCss", e.target.value)}
          className={`${input} font-mono text-xs`}
          placeholder=".storefront-hero { ... }"
        />
      </Section>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-60"
        >
          {save.isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[16px] border border-warm-border bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  span,
  children,
}: {
  label: string;
  hint?: string;
  span?: number;
  children: React.ReactNode;
}) {
  return (
    <div className={span === 2 ? "sm:col-span-2" : undefined}>
      <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-warm-border bg-white p-3 hover:bg-warm-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-coral"
      />
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-text-secondary">{hint}</div>}
      </div>
    </label>
  );
}
