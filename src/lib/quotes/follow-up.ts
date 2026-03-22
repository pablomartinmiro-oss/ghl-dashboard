import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/client";
import {
  buildReminder1HTML,
  buildReminder2HTML,
  buildDiscountOfferHTML,
  buildExpiryWarningHTML,
  buildExpiredHTML,
  buildCrossSellHTML,
  buildReviewRequestHTML,
  buildPreTrip48hHTML,
  buildPreTrip24hHTML,
  buildPreTripDayOfHTML,
  SMS_MESSAGES,
} from "@/lib/email/followup-templates";
import { getGHLClient } from "@/lib/ghl/api";

const log = logger.child({ module: "quote-followup" });

const DISCOUNT_CODE = "PTSK2526";
const TRIPADVISOR_URL = "https://www.tripadvisor.es/UserReviewEdit-g1-d1-Skicenter.html";

const DESTINATION_LABELS: Record<string, string> = {
  baqueira: "Baqueira Beret",
  sierra_nevada: "Sierra Nevada",
  formigal: "Formigal",
  alto_campoo: "Alto Campoo",
  grandvalira: "Grandvalira",
  la_pinilla: "La Pinilla",
  valdesqui: "Valdesquí",
};

function destLabel(dest: string): string {
  return DESTINATION_LABELS[dest] ?? dest;
}

function hoursDiff(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60);
}

// ==================== SMS VIA GHL ====================

async function sendSMS(
  tenantId: string,
  contactId: string,
  message: string
): Promise<boolean> {
  try {
    const ghl = await getGHLClient(tenantId);
    await ghl.sendMessage(contactId, {
      type: "SMS",
      body: message,
      contactId,
    });
    return true;
  } catch (err) {
    log.warn({ error: err, contactId }, "GHL SMS send failed — skipping");
    return false;
  }
}

// ==================== UNPAID QUOTE REMINDERS ====================

interface QuoteForReminder {
  id: string;
  tenantId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  ghlContactId: string | null;
  destination: string;
  totalAmount: number;
  sentAt: Date | null;
  expiresAt: Date | null;
  redsysPaymentUrl: string | null;
  reminderCount: number;
  lastReminderStep: string | null;
  reminderSentAt: Date | null;
}

type ReminderStep = "reminder_1" | "reminder_2" | "discount" | "expiry_warning";

function determineReminderStep(
  quote: QuoteForReminder,
  now: Date
): ReminderStep | "expire" | null {
  if (!quote.sentAt) return null;

  const hoursSinceSent = hoursDiff(quote.sentAt, now);
  const lastStep = quote.lastReminderStep;

  // Check expiry first
  if (quote.expiresAt && now >= quote.expiresAt) {
    return "expire";
  }

  // Expiry warning: 2 days before expiresAt
  if (quote.expiresAt) {
    const hoursUntilExpiry = hoursDiff(now, quote.expiresAt);
    if (hoursUntilExpiry <= 48 && hoursUntilExpiry > 0 && lastStep !== "expiry_warning") {
      return "expiry_warning";
    }
  }

  // Never send more than 1 reminder per day — check last sent
  if (quote.reminderSentAt) {
    const hoursSinceLastReminder = hoursDiff(quote.reminderSentAt, now);
    if (hoursSinceLastReminder < 24) return null;
  }

  // Sequence based on hours since sent
  if (hoursSinceSent >= 72 && !lastStep?.includes("discount") && lastStep !== "expiry_warning") {
    return "discount";
  }
  if (hoursSinceSent >= 48 && (!lastStep || lastStep === "reminder_1")) {
    return "reminder_2";
  }
  if (hoursSinceSent >= 24 && !lastStep) {
    return "reminder_1";
  }

  return null;
}

export async function processUnpaidReminders(): Promise<{
  sent: number;
  expired: number;
  errors: number;
}> {
  const now = new Date();
  let sent = 0;
  let expired = 0;
  let errors = 0;

  // Find all sent quotes that aren't paid/expired/cancelled
  const quotes = await prisma.quote.findMany({
    where: {
      status: "enviado",
      sentAt: { not: null },
      tenant: { isDemo: false },
    },
    select: {
      id: true,
      tenantId: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      ghlContactId: true,
      destination: true,
      totalAmount: true,
      sentAt: true,
      expiresAt: true,
      redsysPaymentUrl: true,
      reminderCount: true,
      lastReminderStep: true,
      reminderSentAt: true,
    },
  });

  for (const quote of quotes) {
    const step = determineReminderStep(quote, now);
    if (!step) continue;

    try {
      if (step === "expire") {
        await handleExpiry(quote, now);
        expired++;
        continue;
      }

      await sendReminderForStep(quote, step, now);
      sent++;
    } catch (err) {
      log.error({ error: err, quoteId: quote.id, step }, "Failed to process reminder");
      errors++;
    }
  }

  return { sent, expired, errors };
}

async function sendReminderForStep(
  quote: QuoteForReminder,
  step: ReminderStep,
  now: Date
): Promise<void> {
  const firstName = quote.clientName.split(" ")[0];
  const quoteNumber = quote.id.slice(-8).toUpperCase();
  const destination = destLabel(quote.destination);
  const paymentUrl = quote.redsysPaymentUrl ?? undefined;

  const baseParams = {
    firstName,
    destination,
    quoteNumber,
    totalAmount: quote.totalAmount,
    paymentUrl,
  };

  let html: string;
  let subject: string;
  let smsText: string | null = null;

  switch (step) {
    case "reminder_1":
      html = buildReminder1HTML(baseParams);
      subject = `Tu viaje a ${destination} te espera — Presupuesto ${quoteNumber}`;
      smsText = SMS_MESSAGES.reminder_1(destination, paymentUrl);
      break;
    case "reminder_2":
      html = buildReminder2HTML(baseParams);
      subject = `Segundo recordatorio — Presupuesto ${quoteNumber}`;
      smsText = SMS_MESSAGES.reminder_2(paymentUrl);
      break;
    case "discount":
      html = buildDiscountOfferHTML({ ...baseParams, discountCode: DISCOUNT_CODE });
      subject = `Oferta especial para tu viaje — Presupuesto ${quoteNumber}`;
      smsText = SMS_MESSAGES.discount(paymentUrl);
      break;
    case "expiry_warning": {
      const expiresAt = quote.expiresAt
        ? new Date(quote.expiresAt).toLocaleDateString("es-ES")
        : "";
      html = buildExpiryWarningHTML({ ...baseParams, expiresAt });
      subject = `⚠️ Tu presupuesto ${quoteNumber} expira en 2 días`;
      smsText = SMS_MESSAGES.expiry_warning(quoteNumber, paymentUrl);
      break;
    }
  }

  // Send email
  if (quote.clientEmail) {
    await sendEmail({
      tenantId: quote.tenantId,
      contactId: quote.ghlContactId ?? null,
      to: quote.clientEmail,
      subject,
      html,
    });
  }

  // Send SMS via GHL if contact has phone
  if (quote.clientPhone && quote.ghlContactId && smsText) {
    await sendSMS(quote.tenantId, quote.ghlContactId, smsText);
  }

  // Update quote tracking
  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      reminderSentAt: now,
      reminderCount: { increment: 1 },
      lastReminderStep: step,
    },
  });

  log.info(
    { quoteId: quote.id, step, email: quote.clientEmail, phone: !!quote.clientPhone },
    `[CRON] Sent reminder ${step} to ${quote.clientEmail} for quote ${quoteNumber}`
  );
}

async function handleExpiry(quote: QuoteForReminder, now: Date): Promise<void> {
  const firstName = quote.clientName.split(" ")[0];
  const quoteNumber = quote.id.slice(-8).toUpperCase();

  // Send expired notification email
  if (quote.clientEmail) {
    const html = buildExpiredHTML({ firstName, quoteNumber });
    await sendEmail({
      tenantId: quote.tenantId,
      contactId: quote.ghlContactId ?? null,
      to: quote.clientEmail,
      subject: `Presupuesto ${quoteNumber} expirado`,
      html,
    });
  }

  // Send SMS
  if (quote.clientPhone && quote.ghlContactId) {
    await sendSMS(quote.tenantId, quote.ghlContactId, SMS_MESSAGES.expired(quoteNumber));
  }

  // Mark as expired
  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: "expirado",
      lastReminderStep: "expired",
    },
  });

  // Create internal notification for the team
  await createTeamNotification(
    quote.tenantId,
    "quote_expired",
    `Presupuesto ${quoteNumber} expirado`,
    `El presupuesto de ${quote.clientName} por ${formatEURSimple(quote.totalAmount)} ha expirado sin pago.`,
    { quoteId: quote.id }
  );

  log.info(
    { quoteId: quote.id },
    `[CRON] Quote ${quoteNumber} expired — client ${quote.clientEmail} notified`
  );
}

// ==================== POST-PAYMENT FOLLOW-UP ====================

export async function processPostPaymentFollowUp(): Promise<{
  crossSellSent: number;
  reviewsSent: number;
  errors: number;
}> {
  const now = new Date();
  let crossSellSent = 0;
  let reviewsSent = 0;
  let errors = 0;

  // Find paid quotes needing cross-sell (+24h after payment)
  const paidQuotes = await prisma.quote.findMany({
    where: {
      status: "pagado",
      paidAt: { not: null },
      crossSellSentAt: null,
      tenant: { isDemo: false },
    },
    include: { items: true },
  });

  for (const quote of paidQuotes) {
    if (!quote.paidAt) continue;
    const hoursSincePaid = hoursDiff(quote.paidAt, now);
    if (hoursSincePaid < 24) continue;

    try {
      const firstName = quote.clientName.split(" ")[0];
      const destination = destLabel(quote.destination);
      const existingCategories = new Set(quote.items.map((i) => i.category).filter(Boolean));

      const allServices = [
        { cat: "forfait", label: "Forfait / Pase de pistas" },
        { cat: "escuela", label: "Clases de esquí en grupo" },
        { cat: "clase_particular", label: "Clases particulares" },
        { cat: "alquiler", label: "Alquiler de material" },
        { cat: "locker", label: "Taquilla / Locker" },
        { cat: "menu", label: "Menú en pistas" },
        { cat: "apreski", label: "Actividades après-ski" },
        { cat: "snowcamp", label: "SnowCamp infantil" },
        { cat: "taxi", label: "Transporte / Taxi" },
      ];

      const missingServices = allServices
        .filter((s) => !existingCategories.has(s.cat))
        .map((s) => s.label);

      if (missingServices.length === 0) {
        // Already has everything — skip
        await prisma.quote.update({
          where: { id: quote.id },
          data: { crossSellSentAt: now },
        });
        continue;
      }

      if (quote.clientEmail) {
        const html = buildCrossSellHTML({
          firstName,
          destination,
          quoteNumber: quote.id.slice(-8).toUpperCase(),
          missingServices,
        });
        await sendEmail({
          tenantId: quote.tenantId,
          contactId: quote.ghlContactId ?? null,
          to: quote.clientEmail,
          subject: `Completa tu viaje a ${destination} ❄️`,
          html,
        });
      }

      if (quote.clientPhone && quote.ghlContactId) {
        await sendSMS(quote.tenantId, quote.ghlContactId, SMS_MESSAGES.cross_sell(destination));
      }

      await prisma.quote.update({
        where: { id: quote.id },
        data: { crossSellSentAt: now },
      });

      crossSellSent++;
      log.info(
        { quoteId: quote.id },
        `[CRON] Sent cross-sell to ${quote.clientEmail}`
      );
    } catch (err) {
      log.error({ error: err, quoteId: quote.id }, "Failed cross-sell");
      errors++;
    }
  }

  // Find paid quotes needing review request (+5h after checkOut)
  const reviewQuotes = await prisma.quote.findMany({
    where: {
      status: "pagado",
      reviewSentAt: null,
      tenant: { isDemo: false },
    },
  });

  for (const quote of reviewQuotes) {
    const hoursAfterCheckout = hoursDiff(quote.checkOut, now);
    if (hoursAfterCheckout < 5) continue;

    try {
      if (quote.clientEmail) {
        const html = buildReviewRequestHTML({
          firstName: quote.clientName.split(" ")[0],
          destination: destLabel(quote.destination),
          tripadvisorUrl: TRIPADVISOR_URL,
        });
        await sendEmail({
          tenantId: quote.tenantId,
          contactId: quote.ghlContactId ?? null,
          to: quote.clientEmail,
          subject: "¡Gracias por confiar en Skicenter! ⭐",
          html,
        });
      }

      await prisma.quote.update({
        where: { id: quote.id },
        data: { reviewSentAt: now },
      });

      reviewsSent++;
      log.info({ quoteId: quote.id }, `[CRON] Sent review request to ${quote.clientEmail}`);
    } catch (err) {
      log.error({ error: err, quoteId: quote.id }, "Failed review request");
      errors++;
    }
  }

  return { crossSellSent, reviewsSent, errors };
}

// ==================== PRE-TRIP REMINDERS ====================

export async function processPreTripReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  const now = new Date();
  let sent = 0;
  let errors = 0;

  const paidQuotes = await prisma.quote.findMany({
    where: {
      status: "pagado",
      tenant: { isDemo: false },
      OR: [
        { preTripStep: null },
        { preTripStep: "pre_48h" },
        { preTripStep: "pre_24h" },
      ],
    },
  });

  for (const quote of paidQuotes) {
    const hoursUntilCheckIn = hoursDiff(now, quote.checkIn);
    const lastStep = quote.preTripStep;

    let step: "pre_48h" | "pre_24h" | "day_of" | null = null;

    if (hoursUntilCheckIn <= 0 && hoursUntilCheckIn > -24 && lastStep !== "day_of") {
      step = "day_of";
    } else if (hoursUntilCheckIn <= 24 && hoursUntilCheckIn > 0 && lastStep !== "pre_24h" && lastStep !== "day_of") {
      step = "pre_24h";
    } else if (hoursUntilCheckIn <= 48 && hoursUntilCheckIn > 24 && !lastStep) {
      step = "pre_48h";
    }

    if (!step) continue;

    try {
      const firstName = quote.clientName.split(" ")[0];
      const destination = destLabel(quote.destination);
      const quoteNumber = quote.id.slice(-8).toUpperCase();
      const baseParams = { firstName, destination, quoteNumber };

      let html: string;
      let subject: string;
      let smsText: string;

      switch (step) {
        case "pre_48h":
          html = buildPreTrip48hHTML(baseParams);
          subject = `¡Tu viaje a ${destination} se acerca! 🎿`;
          smsText = SMS_MESSAGES.pre_trip_48h(destination);
          break;
        case "pre_24h":
          html = buildPreTrip24hHTML(baseParams);
          subject = `¡Mañana empieza tu aventura en ${destination}! ⛷️`;
          smsText = SMS_MESSAGES.pre_trip_24h(destination);
          break;
        case "day_of":
          html = buildPreTripDayOfHTML(baseParams);
          subject = `Bienvenido a ${destination} ⛷️🏔️`;
          smsText = SMS_MESSAGES.pre_trip_day_of(destination);
          break;
      }

      if (quote.clientEmail) {
        await sendEmail({
          tenantId: quote.tenantId,
          contactId: quote.ghlContactId ?? null,
          to: quote.clientEmail,
          subject,
          html,
        });
      }

      if (quote.clientPhone && quote.ghlContactId) {
        await sendSMS(quote.tenantId, quote.ghlContactId, smsText);
      }

      await prisma.quote.update({
        where: { id: quote.id },
        data: { preTripStep: step },
      });

      sent++;
      log.info(
        { quoteId: quote.id, step },
        `[CRON] Sent pre-trip ${step} to ${quote.clientEmail}`
      );
    } catch (err) {
      log.error({ error: err, quoteId: quote.id }, "Failed pre-trip reminder");
      errors++;
    }
  }

  return { sent, errors };
}

// ==================== AT-RISK DETECTION ====================

export async function flagAtRiskQuotes(): Promise<number> {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const atRiskQuotes = await prisma.quote.findMany({
    where: {
      status: "enviado",
      sentAt: { lte: fiveDaysAgo },
      tenant: { isDemo: false },
    },
    select: {
      id: true,
      tenantId: true,
      clientName: true,
      totalAmount: true,
    },
  });

  let flagged = 0;
  for (const quote of atRiskQuotes) {
    const quoteNumber = quote.id.slice(-8).toUpperCase();
    await createTeamNotification(
      quote.tenantId,
      "quote_at_risk",
      `Presupuesto ${quoteNumber} en riesgo`,
      `${quote.clientName} lleva 5+ días sin pagar (${formatEURSimple(quote.totalAmount)}). Requiere seguimiento manual.`,
      { quoteId: quote.id }
    );
    flagged++;
  }

  if (flagged > 0) {
    log.info({ flagged }, `[CRON] Flagged ${flagged} at-risk quotes`);
  }

  return flagged;
}

// ==================== HELPERS ====================

async function createTeamNotification(
  tenantId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  // Notify all Owners and Managers in the tenant
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { name: { in: ["Owner", "Manager"] } },
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      tenantId,
      userId: u.id,
      type,
      title,
      body,
      data: JSON.parse(JSON.stringify(data)),
    })),
  });
}

function formatEURSimple(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
