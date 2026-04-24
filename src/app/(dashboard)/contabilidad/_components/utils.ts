export function fmtEUR(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type RangePreset = "este_mes" | "mes_anterior" | "trimestre" | "anio" | "custom";

export function presetToRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const start = (yr: number, mo: number, day = 1) => new Date(yr, mo, day, 0, 0, 0);
  const end = (yr: number, mo: number, day: number) =>
    new Date(yr, mo, day, 23, 59, 59, 999);

  switch (preset) {
    case "este_mes": {
      const from = start(y, m);
      const to = end(y, m + 1, 0);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    case "mes_anterior": {
      const from = start(y, m - 1);
      const to = end(y, m, 0);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    case "trimestre": {
      const q = Math.floor(m / 3);
      const from = start(y, q * 3);
      const to = end(y, q * 3 + 3, 0);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    case "anio": {
      const from = start(y, 0);
      const to = end(y, 12, 0);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    default: {
      const from = start(y, m);
      const to = end(y, m + 1, 0);
      return { from: from.toISOString(), to: to.toISOString() };
    }
  }
}

export const TX_CATEGORIES = [
  { value: "reservation", label: "Reserva" },
  { value: "quote", label: "Presupuesto" },
  { value: "groupon", label: "Groupon" },
  { value: "supplier", label: "Proveedor" },
  { value: "operational", label: "Operativo" },
  { value: "tax", label: "Impuestos" },
  { value: "other", label: "Otro" },
];

export const TX_TYPES = [
  { value: "income", label: "Ingreso" },
  { value: "expense", label: "Gasto" },
  { value: "supplier_settlement", label: "Liquidación proveedor" },
  { value: "refund", label: "Devolución" },
];

export const PAYMENT_METHODS = [
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "groupon", label: "Groupon" },
];

export function categoryLabel(slug: string): string {
  return TX_CATEGORIES.find((c) => c.value === slug)?.label ?? slug;
}

export function typeLabel(slug: string): string {
  return TX_TYPES.find((t) => t.value === slug)?.label ?? slug;
}

export function isExpenseType(t: string): boolean {
  return t === "expense" || t === "supplier_settlement";
}

export function settlementStatusBadge(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "draft":
      return { label: "Borrador", className: "bg-zinc-100 text-zinc-700" };
    case "sent":
      return { label: "Enviado", className: "bg-blue-100 text-blue-700" };
    case "confirmed":
      return { label: "Confirmado", className: "bg-emerald-100 text-emerald-700" };
    case "paid":
      return { label: "Pagado", className: "bg-purple-100 text-purple-700" };
    case "cancelled":
      return { label: "Cancelado", className: "bg-red-100 text-red-700" };
    default:
      return { label: status, className: "bg-zinc-100 text-zinc-700" };
  }
}
