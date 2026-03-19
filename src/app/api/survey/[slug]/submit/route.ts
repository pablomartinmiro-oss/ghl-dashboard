import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/client";
import { createSurveyOpportunity } from "@/lib/quotes/opportunity";
import { createNotification } from "@/lib/notifications";

const log = logger.child({ module: "survey-submit" });

type Season = "alta" | "media" | "baja";

function detectSeason(checkIn: string): Season {
  const d = new Date(checkIn);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 12 && day >= 20) || (m === 1 && day <= 6) || (m === 2 && day >= 15)) return "alta";
  if ((m === 1 && day >= 7) || (m === 2 && day <= 14) || m === 3) return "media";
  return "baja";
}

function getDays(ci: string, co: string): number {
  return Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86400000));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMatrixPrice(p: { price: number; pricingMatrix: any }, days: number, season: Season): number {
  if (p.pricingMatrix) {
    const m = p.pricingMatrix as Record<string, Record<string, number>>;
    const sp = m[season] ?? m["media"] ?? m["media_quality"];
    if (sp) {
      const ds = String(days);
      if (sp[ds] !== undefined) return sp[ds];
      const keys = Object.keys(sp).map(Number).sort((a, b) => a - b);
      if (days > keys[keys.length - 1]) return sp[String(keys[keys.length - 1])];
      return (sp["1"] ?? p.price) * days;
    }
  }
  return p.price * days;
}

function confirmationHtml(name: string, destination: string, ci: string, co: string): string {
  const dest = destination.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  return `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px">
    <h2 style="color:#E87B5A">¡Hemos recibido tu solicitud!</h2>
    <p>Hola <strong>${name}</strong>,</p>
    <p>Hemos recibido tu solicitud de presupuesto para <strong>${dest}</strong>
       del <strong>${fmt(ci)}</strong> al <strong>${fmt(co)}</strong>.</p>
    <p>En breve recibirás tu presupuesto personalizado con todos los detalles.</p>
    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
    <p>Un saludo,<br/>El equipo Skicenter</p>
  </div>`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  let body: {
    name: string;
    email: string;
    phone: string;
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    services: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { name, email, phone, destination, checkIn, checkOut, services } = body;
  const adults = Math.max(1, Number(body.adults) || 1);
  const children = Math.max(0, Number(body.children) || 0);

  if (!name || !destination || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const season = detectSeason(checkIn);
  const days = getDays(checkIn, checkOut);

  const wantsForfait = services.includes("forfait");
  const wantsEquipment = services.includes("alquiler");
  const wantsClases = services.includes("escuela");
  const wantsAccommodation = services.includes("alojamiento");

  // Duplicate check
  const existing = await prisma.quote.findFirst({
    where: {
      tenantId: tenant.id,
      status: "borrador",
      destination,
      clientEmail: email || undefined,
      checkIn: { lte: new Date(checkOut) },
      checkOut: { gte: new Date(checkIn) },
    },
    select: { id: true },
  });

  if (existing) {
    log.info({ tenantId: tenant.id, quoteId: existing.id }, "Duplicate survey submission — returning existing quote");
    return NextResponse.json({ quoteId: existing.id, duplicate: true });
  }

  // Fetch products for this station
  const products = await prisma.product.findMany({
    where: { tenantId: null, isActive: true, station: { in: [destination, "all"] } },
  });

  interface QuoteItemInput {
    productId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalPrice: number;
  }
  const items: QuoteItemInput[] = [];

  if (wantsForfait) {
    const forf = products.filter((p) => p.category === "forfait" && p.isActive);
    const af = forf.find((p) => p.personType === "adulto");
    if (af) {
      const pr = getMatrixPrice(af, days, season);
      items.push({ productId: af.id, name: af.name, quantity: adults, unitPrice: pr, discount: 0, totalPrice: pr * adults });
    }
    if (children > 0) {
      const cf = forf.find((p) => p.personType === "infantil");
      if (cf) {
        const pr = getMatrixPrice(cf, days, season);
        items.push({ productId: cf.id, name: cf.name, quantity: children, unitPrice: pr, discount: 0, totalPrice: pr * children });
      }
    }
  }

  if (wantsEquipment) {
    const alq = products.filter((p) => p.category === "alquiler" && p.isActive);
    const ap =
      alq.find((p) => p.personType === "adulto" && (p.tier === "media" || p.tier === "media_quality") && p.includesHelmet) ??
      alq.find((p) => p.personType === "adulto" && (p.tier === "media" || p.tier === "media_quality")) ??
      alq.find((p) => p.personType === "adulto");
    if (ap) {
      const pr = getMatrixPrice(ap, days, season);
      items.push({ productId: ap.id, name: ap.name, quantity: adults, unitPrice: pr, discount: 0, totalPrice: pr * adults });
    }
    if (children > 0) {
      const cp =
        alq.find((p) => p.personType === "infantil" && (p.tier === "media" || p.tier === "media_quality")) ??
        alq.find((p) => p.personType === "infantil");
      if (cp) {
        const pr = getMatrixPrice(cp, days, season);
        items.push({ productId: cp.id, name: cp.name, quantity: children, unitPrice: pr, discount: 0, totalPrice: pr * children });
      }
    }
  }

  if (wantsClases) {
    const esc = products.filter((p) => p.category === "escuela" && p.isActive);
    const cur = esc.find((p) => p.name.toLowerCase().includes("colectivo")) ?? esc[0];
    if (cur) {
      const pr = getMatrixPrice(cur, days, season);
      items.push({ productId: cur.id, name: cur.name, quantity: adults + children, unitPrice: pr, discount: 0, totalPrice: pr * (adults + children) });
    }
  }

  const totalAmount = items.reduce((s, i) => s + i.totalPrice, 0);

  // GHL opportunity (non-blocking — no contact ID from direct form submissions)
  const opp = await createSurveyOpportunity(tenant.id, "", destination, name, totalAmount).catch(() => null);

  const quote = await prisma.quote.create({
    data: {
      tenantId: tenant.id,
      ghlOpportunityId: opp?.opportunityId ?? null,
      ghlPipelineId: opp?.pipelineId ?? null,
      ghlStageId: opp?.stageId ?? null,
      clientName: name,
      clientEmail: email || null,
      clientPhone: phone || null,
      destination,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      adults,
      children,
      wantsForfait,
      wantsEquipment,
      wantsClases,
      wantsAccommodation,
      status: "borrador",
      source: "survey",
      totalAmount,
    },
  });

  if (items.length > 0) {
    await prisma.quoteItem.createMany({ data: items.map((item) => ({ ...item, quoteId: quote.id })) });
  }

  log.info({ tenantId: tenant.id, quoteId: quote.id, destination, season, totalAmount }, "Quote created from public survey");

  // Notify owners/managers of new survey lead (non-blocking)
  const destLabel = destination.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  createNotification(
    tenant.id,
    "new_lead",
    `Nuevo lead — ${name}`,
    `${destLabel} · ${adults} adulto${adults !== 1 ? "s" : ""}${children > 0 ? ` + ${children} niño${children !== 1 ? "s" : ""}` : ""} · ${totalAmount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`,
    { quoteId: quote.id }
  ).catch(() => null);

  if (email) {
    sendEmail({
      tenantId: tenant.id,
      contactId: null,
      to: email,
      subject: "Hemos recibido tu solicitud de presupuesto — Skicenter",
      html: confirmationHtml(name, destination, checkIn, checkOut),
    }).catch((err) => log.warn({ error: err }, "Failed to send confirmation email"));
  }

  return NextResponse.json({ quoteId: quote.id });
}
