"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateCampaign,
  useUpdateCampaign,
  useTemplates,
  type Campaign,
  type CampaignType,
  type CampaignStatus,
} from "@/hooks/useMarketing";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: Campaign | null;
}

interface FormState {
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject: string;
  content: string;
  templateId: string;
  scheduledAt: string;
  audienceTags: string;
  audienceLastDays: string;
}

const empty: FormState = {
  name: "",
  type: "email",
  status: "draft",
  subject: "",
  content: "",
  templateId: "",
  scheduledAt: "",
  audienceTags: "",
  audienceLastDays: "",
};

const INPUT_CLS =
  "w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral/30";

function toLocalDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function CampaignModal({ open, onClose, initial }: Props) {
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const { data: templates = [] } = useTemplates();
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        type: initial.type,
        status: initial.status,
        subject: initial.subject ?? "",
        content: initial.content ?? "",
        templateId: initial.templateId ?? "",
        scheduledAt: toLocalDateTime(initial.scheduledAt),
        audienceTags: initial.audienceFilter?.tags?.join(", ") ?? "",
        audienceLastDays:
          initial.audienceFilter?.lastActivityDays?.toString() ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [initial, open]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function applyTemplate(templateId: string) {
    set("templateId", templateId);
    if (!templateId) return;
    const t = templates.find((tt) => tt.id === templateId);
    if (t && form.type === "email") {
      if (!form.subject) set("subject", t.subject);
      if (!form.content) set("content", t.body);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    const tags = form.audienceTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const lastActivityDays = form.audienceLastDays
      ? parseInt(form.audienceLastDays, 10)
      : undefined;
    const audienceFilter =
      tags.length > 0 || lastActivityDays
        ? {
            ...(tags.length > 0 ? { tags } : {}),
            ...(lastActivityDays ? { lastActivityDays } : {}),
          }
        : null;

    const payload = {
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      subject: form.subject.trim() || null,
      content: form.content.trim() || null,
      templateId: form.templateId || null,
      audienceFilter,
      scheduledAt: form.scheduledAt
        ? new Date(form.scheduledAt).toISOString()
        : null,
    };

    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, ...payload });
        toast.success("Campaña actualizada");
      } else {
        await create.mutateAsync(payload);
        toast.success("Campaña creada");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar campaña" : "Nueva campaña"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nombre">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={INPUT_CLS}
              placeholder="Promo Navidad 2026"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Canal">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as CampaignType)}
                className={INPUT_CLS}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="push">Push</option>
              </select>
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as CampaignStatus)
                }
                className={INPUT_CLS}
              >
                <option value="draft">Borrador</option>
                <option value="scheduled">Programada</option>
                <option value="paused">Pausada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </Field>
          </div>
          {form.type === "email" && (
            <Field label="Plantilla">
              <select
                value={form.templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">— Ninguna —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.type === "email" && (
            <Field label="Asunto">
              <input
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
          )}
          <Field label="Contenido">
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              className={`${INPUT_CLS} min-h-32 font-mono text-xs`}
              rows={6}
              placeholder="Hola {{nombre}}, tenemos una oferta para tu próximo viaje a {{destino}}..."
            />
          </Field>
          <Field label="Programada para">
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => set("scheduledAt", e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <fieldset className="rounded-[10px] border border-warm-border p-3">
            <legend className="px-1 text-xs font-medium text-text-secondary">
              Audiencia
            </legend>
            <div className="space-y-2">
              <Field label="Tags (separados por comas)">
                <input
                  value={form.audienceTags}
                  onChange={(e) => set("audienceTags", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="vip, lead"
                />
              </Field>
              <Field label="Actividad últimos días">
                <input
                  type="number"
                  min="0"
                  value={form.audienceLastDays}
                  onChange={(e) => set("audienceLastDays", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="30"
                />
              </Field>
            </div>
          </fieldset>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-warm-border bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
            >
              {initial ? "Guardar cambios" : "Crear campaña"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
