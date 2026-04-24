type TemplateValue = string | number | boolean | null | undefined | Date | TemplateValue[] | { [k: string]: TemplateValue };
export type TemplateContext = Record<string, TemplateValue>;

export interface TenantBrandingLite {
  businessName?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  website?: string | null;
  address?: string | null;
  cif?: string | null;
}

const HELPERS: Record<string, (value: TemplateValue) => string> = {
  formatDate: (value) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(d);
  },
  formatMoney: (value) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return String(value ?? "");
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
  },
  uppercase: (value) => String(value ?? "").toUpperCase(),
};

function resolvePath(ctx: TemplateContext, path: string): TemplateValue {
  const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
  let current: TemplateValue = ctx;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || Array.isArray(current) || current instanceof Date) {
      return undefined;
    }
    current = (current as Record<string, TemplateValue>)[part];
  }
  return current;
}

function isTruthy(value: TemplateValue): boolean {
  if (value == null || value === false || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "number" && value === 0) return false;
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEach(template: string, ctx: TemplateContext): string {
  return template.replace(
    /\{\{#each\s+([^}]+?)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, expr: string, inner: string) => {
      const list = resolvePath(ctx, expr.trim());
      if (!Array.isArray(list)) return "";
      return list
        .map((item) => {
          const itemCtx: TemplateContext = { ...ctx, this: item as TemplateValue };
          if (item && typeof item === "object" && !Array.isArray(item) && !(item instanceof Date)) {
            Object.assign(itemCtx, item as Record<string, TemplateValue>);
          }
          return renderInternal(inner, itemCtx);
        })
        .join("");
    }
  );
}

function renderConditionals(template: string, ctx: TemplateContext): string {
  let out = template;
  let prev: string;
  do {
    prev = out;
    out = out.replace(
      /\{\{#if\s+([^}]+?)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
      (_match, expr: string, truthy: string, falsy: string | undefined) => {
        const value = resolvePath(ctx, expr.trim());
        return isTruthy(value) ? truthy : (falsy ?? "");
      }
    );
  } while (out !== prev);
  return out;
}

function renderVariables(template: string, ctx: TemplateContext): string {
  return template.replace(
    /\{\{\s*(?:([a-zA-Z_]\w*)\s+)?([\w.]+)\s*\}\}/g,
    (_match, helperName: string | undefined, path: string) => {
      const raw = resolvePath(ctx, path);
      if (helperName) {
        const fn = HELPERS[helperName];
        if (fn) return escapeHtml(fn(raw));
      }
      if (raw == null) return "";
      if (raw instanceof Date) return escapeHtml(raw.toISOString());
      if (typeof raw === "object") return escapeHtml(JSON.stringify(raw));
      return escapeHtml(String(raw));
    }
  );
}

function renderInternal(template: string, ctx: TemplateContext): string {
  return renderVariables(renderConditionals(renderEach(template, ctx), ctx), ctx);
}

export function renderTemplate(template: string, ctx: TemplateContext, branding?: TenantBrandingLite): string {
  const context: TemplateContext = {
    ...ctx,
    branding: brandingToContext(branding),
  };
  return renderInternal(template, context);
}

function brandingToContext(branding?: TenantBrandingLite): TemplateContext {
  if (!branding) {
    return {
      businessName: "",
      logoUrl: "",
      primaryColor: "#E87B5A",
      secondaryColor: "#5B8C6D",
      supportEmail: "",
      supportPhone: "",
      website: "",
      address: "",
      cif: "",
    };
  }
  return {
    businessName: branding.businessName ?? "",
    logoUrl: branding.logoUrl ?? "",
    primaryColor: branding.primaryColor ?? "#E87B5A",
    secondaryColor: branding.secondaryColor ?? "#5B8C6D",
    supportEmail: branding.supportEmail ?? "",
    supportPhone: branding.supportPhone ?? "",
    website: branding.website ?? "",
    address: branding.address ?? "",
    cif: branding.cif ?? "",
  };
}

export function extractVariables(template: string): string[] {
  const found = new Set<string>();
  const variableRe = /\{\{\s*(?:[a-zA-Z_]\w*\s+)?([\w.]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = variableRe.exec(template)) !== null) {
    found.add(match[1]);
  }
  const blockRe = /\{\{#(?:if|each)\s+([^}]+?)\}\}/g;
  while ((match = blockRe.exec(template)) !== null) {
    found.add(match[1].trim());
  }
  return Array.from(found).sort();
}
