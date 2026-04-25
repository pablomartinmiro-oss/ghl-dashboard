import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  priceCents: number;
  destinationId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CartSnapshot {
  id: string;
  sessionToken: string;
  tenantId: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  items: CartItem[];
  promoCode: string | null;
  discountCents: number;
  subtotalCents: number;
  totalCents: number;
  expiresAt: string;
}

const CART_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function generateCartToken(): string {
  return randomBytes(24).toString("hex");
}

export function calculateTotals(items: CartItem[], discountCents: number) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );
  const totalCents = Math.max(0, subtotalCents - discountCents);
  return { subtotalCents, totalCents };
}

export async function loadCartByToken(
  sessionToken: string
): Promise<CartSnapshot | null> {
  const cart = await prisma.cart.findUnique({ where: { sessionToken } });
  if (!cart) return null;
  if (cart.expiresAt < new Date()) return null;
  return serialize(cart);
}

export async function loadCartById(id: string, tenantId: string) {
  return prisma.cart.findFirst({ where: { id, tenantId } });
}

export function serialize(cart: {
  id: string;
  sessionToken: string;
  tenantId: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  items: unknown;
  promoCode: string | null;
  discountCents: number;
  subtotalCents: number;
  totalCents: number;
  expiresAt: Date;
}): CartSnapshot {
  return {
    id: cart.id,
    sessionToken: cart.sessionToken,
    tenantId: cart.tenantId,
    customerEmail: cart.customerEmail,
    customerName: cart.customerName,
    customerPhone: cart.customerPhone,
    items: Array.isArray(cart.items) ? (cart.items as CartItem[]) : [],
    promoCode: cart.promoCode,
    discountCents: cart.discountCents,
    subtotalCents: cart.subtotalCents,
    totalCents: cart.totalCents,
    expiresAt: cart.expiresAt.toISOString(),
  };
}

export function newExpiry(): Date {
  return new Date(Date.now() + CART_TTL_MS);
}

export interface ApplyPromoResult {
  ok: boolean;
  error?: string;
  discountCents?: number;
}

export async function resolvePromoCode(
  tenantId: string,
  code: string,
  subtotalCents: number
): Promise<ApplyPromoResult> {
  const promo = await prisma.promotion.findUnique({
    where: { tenantId_code: { tenantId, code: code.trim().toUpperCase() } },
  });
  if (!promo) return { ok: false, error: "Codigo no valido" };
  if (promo.status !== "active") return { ok: false, error: "Codigo no activo" };

  const now = new Date();
  if (promo.validFrom > now || promo.validUntil < now) {
    return { ok: false, error: "Codigo fuera de fechas" };
  }
  if (promo.maxUses && promo.currentUses >= promo.maxUses) {
    return { ok: false, error: "Codigo agotado" };
  }
  if (promo.minOrderCents && subtotalCents < promo.minOrderCents) {
    return { ok: false, error: "Importe minimo no alcanzado" };
  }

  let discountCents = 0;
  if (promo.type === "percentage" && promo.value) {
    discountCents = Math.round(subtotalCents * (promo.value / 100));
  } else if (promo.type === "fixed" && promo.value) {
    discountCents = Math.min(subtotalCents, promo.value);
  } else {
    return { ok: false, error: "Tipo de descuento no soportado" };
  }

  return { ok: true, discountCents };
}
