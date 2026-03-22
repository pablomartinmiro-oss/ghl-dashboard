// ==================== FOLLOW-UP EMAIL TEMPLATES ====================

function formatEUR(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function baseStyles(): string {
  return `
    body { margin: 0; padding: 0; background: #FAF9F7; font-family: 'DM Sans', Arial, sans-serif; }
    .container { max-width: 640px; margin: 0 auto; background: #FFFFFF; }
    .header { background: #1a4a4a; color: #FFFFFF; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; letter-spacing: 2px; font-weight: 700; }
    .header p { margin: 8px 0 0; color: #d4e8e8; font-size: 14px; }
    .body { padding: 32px; color: #2D2A26; line-height: 1.7; font-size: 15px; }
    .body p { margin: 0 0 14px; }
    .btn { display: inline-block; background: #E87B5A; color: #FFFFFF; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .footer { background: #f5f5f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #8A8580; }
    .footer a { color: #E87B5A; text-decoration: none; }
    .highlight { background: #e8f4f0; padding: 16px 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .discount-code { font-size: 24px; font-weight: 700; color: #1a4a4a; letter-spacing: 2px; }
  `;
}

function wrapEmail(subtitle: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>${baseStyles()}</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>SKICENTER</h1>
    <p>${subtitle}</p>
  </div>
  <div class="body">
    ${bodyContent}
  </div>
  <div class="footer">
    <p>&copy; SkiCenter — Agencia de viajes de esquí</p>
    <p><a href="mailto:reservas@skicenter.es">reservas@skicenter.es</a> · 639 576 627</p>
  </div>
</div>
</body>
</html>`;
}

function payBtn(url: string, label = "Completar reserva"): string {
  return `<div style="text-align:center; margin:24px 0;"><a href="${url}" class="btn">${label}</a></div>`;
}

// ==================== REMINDER SEQUENCE ====================

interface ReminderParams {
  firstName: string;
  destination: string;
  quoteNumber: string;
  totalAmount: number;
  paymentUrl?: string;
}

/** +24h — First reminder */
export function buildReminder1HTML(p: ReminderParams): string {
  return wrapEmail("Recordatorio de Presupuesto", `
    <p>Hola ${p.firstName},</p>
    <p>Tu viaje a <strong>${p.destination}</strong> sigue esperando ⏳</p>
    <p>Recuerda que estamos en plena temporada y la disponibilidad podría variar.
    Tu presupuesto <strong>N.º ${p.quoteNumber}</strong> por <strong>${formatEUR(p.totalAmount)}</strong> está pendiente de confirmación.</p>
    ${p.paymentUrl ? payBtn(p.paymentUrl) : ""}
    <p style="font-size:14px;">¿Tienes dudas? Llámanos al <strong>639 576 627</strong> o escríbenos a <a href="mailto:reservas@skicenter.es" style="color:#E87B5A;">reservas@skicenter.es</a>.</p>
  `);
}

/** +48h — Second reminder */
export function buildReminder2HTML(p: ReminderParams): string {
  return wrapEmail("Segundo Recordatorio", `
    <p>Hola de nuevo ${p.firstName},</p>
    <p>Este es nuestro segundo recordatorio. Estamos en plena temporada y las disponibilidades podrían variar.</p>
    <p>Tu presupuesto <strong>N.º ${p.quoteNumber}</strong> para <strong>${p.destination}</strong> por <strong>${formatEUR(p.totalAmount)}</strong> sigue disponible.</p>
    ${p.paymentUrl ? payBtn(p.paymentUrl) : ""}
    <p style="font-size:14px;">Estamos aquí para ayudarte. <strong>639 576 627</strong> · <a href="mailto:reservas@skicenter.es" style="color:#E87B5A;">reservas@skicenter.es</a></p>
  `);
}

/** +72h — Discount offer */
export function buildDiscountOfferHTML(p: ReminderParams & { discountCode: string }): string {
  return wrapEmail("Oferta Especial", `
    <p>Hola ${p.firstName},</p>
    <p>Te ofrecemos un código de descuento para que cierres tu viaje con nosotros.</p>
    <div class="highlight">
      <p>Introduce el siguiente código al realizar el pago:</p>
      <p class="discount-code">${p.discountCode}</p>
      <p style="font-size:13px; color:#666;">5% de descuento en tu presupuesto</p>
    </div>
    <p>Tu presupuesto <strong>N.º ${p.quoteNumber}</strong> para <strong>${p.destination}</strong>: <strong>${formatEUR(p.totalAmount)}</strong></p>
    ${p.paymentUrl ? payBtn(p.paymentUrl) : ""}
    <p style="font-size:14px;">No dejes escapar esta oportunidad. <strong>639 576 627</strong> · <a href="mailto:reservas@skicenter.es" style="color:#E87B5A;">reservas@skicenter.es</a></p>
  `);
}

/** 2 days before validUntil — Expiry warning */
export function buildExpiryWarningHTML(p: ReminderParams & { expiresAt: string }): string {
  return wrapEmail("Tu Presupuesto Expira Pronto", `
    <p>Hola ${p.firstName},</p>
    <p>Tu presupuesto <strong>N.º ${p.quoteNumber}</strong> expira en <strong>2 días</strong> (${p.expiresAt}).</p>
    <p>No pierdas tu reserva para <strong>${p.destination}</strong> por <strong>${formatEUR(p.totalAmount)}</strong>.</p>
    ${p.paymentUrl ? payBtn(p.paymentUrl, "Pagar ahora") : ""}
    <p style="font-size:14px;">¿Necesitas más tiempo? Llámanos al <strong>639 576 627</strong>.</p>
  `);
}

/** After expiry — Expired notification */
export function buildExpiredHTML(p: { firstName: string; quoteNumber: string }): string {
  return wrapEmail("Presupuesto Expirado", `
    <p>Hola ${p.firstName},</p>
    <p>Tu presupuesto <strong>N.º ${p.quoteNumber}</strong> ha expirado.</p>
    <p>Contacta con nosotros si quieres un nuevo presupuesto:</p>
    <div class="highlight">
      <p><strong>reservas@skicenter.es</strong> · <strong>639 576 627</strong></p>
    </div>
    <p>Estaremos encantados de ayudarte a planificar tu viaje.</p>
  `);
}

// ==================== POST-PAYMENT FOLLOW-UP ====================

interface CrossSellParams {
  firstName: string;
  destination: string;
  quoteNumber: string;
  missingServices: string[];
}

/** +24h after payment — Cross-sell */
export function buildCrossSellHTML(p: CrossSellParams): string {
  const serviceList = p.missingServices
    .map((s) => `<li style="margin:4px 0;">${s}</li>`)
    .join("");

  return wrapEmail("Completa tu Viaje", `
    <p>Hola ${p.firstName},</p>
    <p>En Skicenter ofrecemos todos los servicios que necesitas para tu viaje ❄️</p>
    <p>¿Quieres completar tu viaje a <strong>${p.destination}</strong> con alguno de estos servicios?</p>
    <ul style="padding-left:20px; line-height:2;">
      ${serviceList}
    </ul>
    <p>Contáctanos y te preparamos un presupuesto complementario:</p>
    <div class="highlight">
      <p><strong>reservas@skicenter.es</strong> · <strong>639 576 627</strong></p>
    </div>
  `);
}

/** +5h after checkout — Review request */
export function buildReviewRequestHTML(p: { firstName: string; destination: string; tripadvisorUrl: string }): string {
  return wrapEmail("¡Gracias por confiar en Skicenter!", `
    <p>Hola ${p.firstName},</p>
    <p>Esperamos que hayas disfrutado de tu viaje a <strong>${p.destination}</strong> ⛷️</p>
    <p>Tu opinión nos ayuda mucho a seguir mejorando. ¿Nos dejas una reseña?</p>
    ${payBtn(p.tripadvisorUrl, "Dejar reseña ⭐")}
    <p style="font-size:14px;">¡Gracias por confiar en nosotros! Nos vemos en la nieve 🏔️</p>
  `);
}

// ==================== PRE-TRIP REMINDERS ====================

interface PreTripParams {
  firstName: string;
  destination: string;
  quoteNumber: string;
}

/** 48h before check-in */
export function buildPreTrip48hHTML(p: PreTripParams): string {
  return wrapEmail("Tu Viaje se Acerca", `
    <p>Hola ${p.firstName},</p>
    <p>¡Quedan solo 2 días para tu viaje a <strong>${p.destination}</strong>!</p>
    <p>No te quedes sin lo que necesitas: forfait, material, clases...</p>
    <p>Si necesitas añadir algo de última hora, contáctanos:</p>
    <div class="highlight">
      <p><strong>reservas@skicenter.es</strong> · <strong>639 576 627</strong></p>
    </div>
  `);
}

/** 24h before check-in */
export function buildPreTrip24hHTML(p: PreTripParams): string {
  return wrapEmail("¡Mañana empieza tu aventura!", `
    <p>Hola ${p.firstName},</p>
    <p>¡No falta nada para tu viaje a <strong>${p.destination}</strong>!</p>
    <p>Espero que tengas un viaje increíble ⛷️</p>
    <p style="font-size:14px;">Recuerda que nuestro servicio receptivo está disponible en el <strong>639 576 627</strong>.</p>
  `);
}

/** Day of arrival */
export function buildPreTripDayOfHTML(p: PreTripParams): string {
  return wrapEmail("¡Bienvenido!", `
    <p>Hola ${p.firstName},</p>
    <p>Bienvenido a <strong>${p.destination}</strong> ⛷️🏔️</p>
    <p>Estamos aquí para ayudarte en todo momento.</p>
    <div class="highlight">
      <p>Servicio receptivo: <strong>639 576 627</strong></p>
    </div>
    <p>¡Disfruta de la nieve!</p>
  `);
}

// ==================== SMS MESSAGES ====================

export const SMS_MESSAGES = {
  reminder_1: (destination: string, paymentUrl?: string) =>
    `Tu viaje a ${destination} sigue esperando ⏳ Recuerda que estamos en plena temporada y la disponibilidad podría variar.${paymentUrl ? ` ${paymentUrl}` : ""} - Skicenter`,

  reminder_2: (paymentUrl?: string) =>
    `Hola de nuevo! Este es nuestro segundo recordatorio. Estamos en plena temporada y las disponibilidades podrían variar.${paymentUrl ? ` ${paymentUrl}` : ""} - Skicenter`,

  discount: (paymentUrl?: string) =>
    `Te ofrecemos un código de descuento para que cierres tu viaje con nosotros. Introduce el código PTSK2526 al realizar el pago.${paymentUrl ? ` ${paymentUrl}` : ""} - Skicenter`,

  expiry_warning: (quoteNumber: string, paymentUrl?: string) =>
    `Tu presupuesto nº ${quoteNumber} expira en 2 días. No pierdas tu reserva.${paymentUrl ? ` ${paymentUrl}` : ""} - Skicenter`,

  expired: (quoteNumber: string) =>
    `Tu presupuesto nº ${quoteNumber} ha expirado. Contacta con nosotros si quieres un nuevo presupuesto: reservas@skicenter.es o 639 576 627 - Skicenter`,

  cross_sell: (destination: string) =>
    `En Skicenter ofrecemos todos los servicios que necesitas para tu viaje a ${destination} ❄️ ¿Quieres completar tu viaje con forfait/clases/material? Contáctanos: 639 576 627 - Skicenter`,

  pre_trip_48h: (destination: string) =>
    `¡Quedan 2 días para tu viaje a ${destination}! No te quedes sin lo que necesitas: forfait, material, clases... 639 576 627 - Skicenter`,

  pre_trip_24h: (destination: string) =>
    `¡No falta nada para tu viaje a ${destination}! Espero que tengas un viaje increíble ⛷️ Servicio receptivo: 639 576 627 - Skicenter`,

  pre_trip_day_of: (destination: string) =>
    `Bienvenido a ${destination} ⛷️🏔️ Estamos aquí para ayudarte en todo momento. Receptivo: 639 576 627 - Skicenter`,
} as const;
