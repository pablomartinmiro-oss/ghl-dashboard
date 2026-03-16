export const STATIONS = [
  { value: "baqueira", label: "Baqueira Beret" },
  { value: "sierra_nevada", label: "Sierra Nevada" },
  { value: "grandvalira", label: "Grandvalira" },
  { value: "formigal", label: "Formigal" },
  { value: "alto_campoo", label: "Alto Campoo" },
  { value: "la_pinilla", label: "La Pinilla" },
] as const;

export const SCHEDULES = [
  { value: "10:00-13:00", label: "10:00 - 13:00" },
  { value: "10:00-14:00", label: "10:00 - 14:00" },
  { value: "15:00-18:00", label: "15:00 - 18:00" },
  { value: "todo_el_dia", label: "Todo el día" },
] as const;

export const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "fr", label: "Francés" },
] as const;

export const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  confirmada: { label: "Confirmada", color: "bg-green-100 text-green-800" },
  sin_disponibilidad: { label: "Sin Disponibilidad", color: "bg-red-100 text-red-800" },
  cancelada: { label: "Cancelada", color: "bg-gray-100 text-gray-600" },
} as const;

export const SOURCE_CONFIG = {
  groupon: { label: "Groupon", icon: "🏷️" },
  caja: { label: "Caja", icon: "💰" },
  web: { label: "Web", icon: "🌐" },
  presupuesto: { label: "Presupuesto", icon: "🔗" },
} as const;

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getStationLabel(value: string): string {
  return STATIONS.find((s) => s.value === value)?.label ?? value;
}
