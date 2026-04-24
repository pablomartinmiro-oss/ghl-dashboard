export const DOCUMENT_TYPES = [
  "quote_pdf",
  "invoice_pdf",
  "booking_confirmation",
  "booking_reminder",
  "welcome_email",
  "settlement_pdf",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  quote_pdf: "Presupuesto (PDF)",
  invoice_pdf: "Factura (PDF)",
  booking_confirmation: "Confirmación de reserva (Email)",
  booking_reminder: "Recordatorio de reserva (Email)",
  welcome_email: "Bienvenida (Email)",
  settlement_pdf: "Liquidación de proveedor (PDF)",
};

export const DOCUMENT_TYPE_KIND: Record<DocumentType, "pdf" | "email"> = {
  quote_pdf: "pdf",
  invoice_pdf: "pdf",
  booking_confirmation: "email",
  booking_reminder: "email",
  welcome_email: "email",
  settlement_pdf: "pdf",
};

export interface DefaultTemplate {
  type: DocumentType;
  name: string;
  subject?: string;
  htmlBody: string;
  variables: { key: string; label: string }[];
}

const baseStyles = `
  body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2D2A26; background: #FAF9F7; margin: 0; padding: 0; }
  .container { max-width: 720px; margin: 0 auto; padding: 32px; background: #ffffff; }
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid {{branding.primaryColor}}; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 700; color: {{branding.primaryColor}}; }
  .meta { font-size: 12px; color: #8A8580; text-align: right; }
  h1, h2, h3 { color: #2D2A26; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { padding: 10px 12px; text-align: left; font-size: 13px; }
  thead th { background: #F5F1EB; color: #2D2A26; font-weight: 600; border-bottom: 1px solid #E8E4DE; }
  tbody td { border-bottom: 1px solid #E8E4DE; }
  .totals { margin-top: 16px; text-align: right; }
  .totals .row { display: flex; justify-content: flex-end; gap: 24px; padding: 4px 0; font-size: 14px; }
  .totals .grand { font-size: 18px; font-weight: 700; color: {{branding.primaryColor}}; padding-top: 8px; border-top: 1px solid #E8E4DE; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: #F5F1EB; font-size: 12px; color: #2D2A26; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8E4DE; font-size: 11px; color: #8A8580; line-height: 1.6; }
  .btn { display: inline-block; padding: 12px 24px; border-radius: 10px; background: {{branding.primaryColor}}; color: #fff; text-decoration: none; font-weight: 600; }
  .panel { background: #FAF9F7; border-radius: 12px; padding: 16px; border: 1px solid #E8E4DE; }
`;

const QUOTE_PDF: DefaultTemplate = {
  type: "quote_pdf",
  name: "Presupuesto — Plantilla por defecto",
  htmlBody: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Presupuesto {{quote.id}}</title>
<style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">{{branding.businessName}}</div>
        {{#if branding.cif}}<div style="font-size:11px;color:#8A8580;">CIF {{branding.cif}}</div>{{/if}}
      </div>
      <div class="meta">
        <div><strong>Presupuesto</strong></div>
        <div>Nº {{quote.id}}</div>
        <div>Fecha: {{formatDate quote.createdAt}}</div>
        {{#if quote.expiresAt}}<div>Vigencia: {{formatDate quote.expiresAt}}</div>{{/if}}
      </div>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <strong>Cliente</strong>
      <div>{{quote.clientName}}</div>
      {{#if quote.clientEmail}}<div style="font-size:13px;color:#8A8580;">{{quote.clientEmail}}</div>{{/if}}
      {{#if quote.clientPhone}}<div style="font-size:13px;color:#8A8580;">{{quote.clientPhone}}</div>{{/if}}
    </div>

    <h2 style="font-size:15px;">Detalle</h2>
    <table>
      <thead>
        <tr><th>Concepto</th><th style="text-align:right;">Cant.</th><th style="text-align:right;">P. Unit.</th><th style="text-align:right;">Total</th></tr>
      </thead>
      <tbody>
        {{#each quote.items}}
        <tr>
          <td>{{name}}{{#if description}}<div style="font-size:11px;color:#8A8580;">{{description}}</div>{{/if}}</td>
          <td style="text-align:right;">{{quantity}}</td>
          <td style="text-align:right;">{{formatMoney unitPrice}}</td>
          <td style="text-align:right;">{{formatMoney totalPrice}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div class="totals">
      <div class="row grand"><span>Total</span><span>{{formatMoney quote.totalAmount}}</span></div>
    </div>

    <div class="footer">
      <p><strong>Términos y condiciones:</strong> Este presupuesto es válido hasta la fecha indicada. La confirmación de la reserva está sujeta a disponibilidad en el momento del pago.</p>
      {{#if branding.supportEmail}}<p>Contacto: {{branding.supportEmail}}{{#if branding.supportPhone}} · {{branding.supportPhone}}{{/if}}</p>{{/if}}
    </div>
  </div>
</body>
</html>`,
  variables: [
    { key: "quote.id", label: "ID del presupuesto" },
    { key: "quote.clientName", label: "Nombre del cliente" },
    { key: "quote.clientEmail", label: "Email del cliente" },
    { key: "quote.clientPhone", label: "Teléfono del cliente" },
    { key: "quote.totalAmount", label: "Importe total" },
    { key: "quote.createdAt", label: "Fecha de creación" },
    { key: "quote.expiresAt", label: "Fecha de vigencia" },
    { key: "quote.items", label: "Líneas del presupuesto (lista)" },
  ],
};

const INVOICE_PDF: DefaultTemplate = {
  type: "invoice_pdf",
  name: "Factura — Plantilla por defecto",
  htmlBody: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Factura {{invoice.number}}</title>
<style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">{{branding.businessName}}</div>
        {{#if branding.cif}}<div style="font-size:11px;color:#8A8580;">CIF {{branding.cif}}</div>{{/if}}
        {{#if branding.address}}<div style="font-size:11px;color:#8A8580;">{{branding.address}}</div>{{/if}}
      </div>
      <div class="meta">
        <div><strong>Factura {{invoice.number}}</strong></div>
        <div>Fecha emisión: {{formatDate invoice.issueDate}}</div>
        {{#if invoice.dueDate}}<div>Fecha vencimiento: {{formatDate invoice.dueDate}}</div>{{/if}}
      </div>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <strong>Facturar a</strong>
      <div>{{invoice.clientName}}</div>
      {{#if invoice.clientCif}}<div style="font-size:13px;color:#8A8580;">CIF/NIF {{invoice.clientCif}}</div>{{/if}}
      {{#if invoice.clientAddress}}<div style="font-size:13px;color:#8A8580;">{{invoice.clientAddress}}</div>{{/if}}
    </div>

    <table>
      <thead>
        <tr><th>Concepto</th><th style="text-align:right;">Cant.</th><th style="text-align:right;">Precio</th><th style="text-align:right;">Total</th></tr>
      </thead>
      <tbody>
        {{#each invoice.items}}
        <tr>
          <td>{{name}}</td>
          <td style="text-align:right;">{{quantity}}</td>
          <td style="text-align:right;">{{formatMoney unitPrice}}</td>
          <td style="text-align:right;">{{formatMoney totalPrice}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>{{formatMoney invoice.subtotal}}</span></div>
      {{#if invoice.taxAmount}}<div class="row"><span>IVA ({{invoice.taxRate}}%)</span><span>{{formatMoney invoice.taxAmount}}</span></div>{{/if}}
      <div class="row grand"><span>Total</span><span>{{formatMoney invoice.total}}</span></div>
    </div>

    <div class="footer">
      <p><strong>Información de pago:</strong> {{invoice.paymentInfo}}</p>
      {{#if branding.supportEmail}}<p>Contacto: {{branding.supportEmail}}{{#if branding.supportPhone}} · {{branding.supportPhone}}{{/if}}</p>{{/if}}
    </div>
  </div>
</body>
</html>`,
  variables: [
    { key: "invoice.number", label: "Número de factura" },
    { key: "invoice.issueDate", label: "Fecha de emisión" },
    { key: "invoice.dueDate", label: "Fecha de vencimiento" },
    { key: "invoice.clientName", label: "Nombre cliente" },
    { key: "invoice.clientCif", label: "CIF/NIF cliente" },
    { key: "invoice.clientAddress", label: "Dirección cliente" },
    { key: "invoice.subtotal", label: "Subtotal" },
    { key: "invoice.taxRate", label: "Porcentaje IVA" },
    { key: "invoice.taxAmount", label: "Importe IVA" },
    { key: "invoice.total", label: "Total" },
    { key: "invoice.paymentInfo", label: "Información de pago" },
    { key: "invoice.items", label: "Líneas de factura (lista)" },
  ],
};

const BOOKING_CONFIRMATION: DefaultTemplate = {
  type: "booking_confirmation",
  name: "Confirmación de reserva — Plantilla por defecto",
  subject: "Tu reserva está confirmada — {{branding.businessName}}",
  htmlBody: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">{{branding.businessName}}</div>
      <span class="badge">Reserva confirmada</span>
    </div>

    <h1 style="font-size:22px;">Hola {{reservation.clientName}},</h1>
    <p>Tu reserva está confirmada. Estamos deseando recibirte.</p>

    <div class="panel" style="margin:16px 0;">
      <p style="margin:4px 0;"><strong>Estación:</strong> {{reservation.station}}</p>
      <p style="margin:4px 0;"><strong>Fecha:</strong> {{formatDate reservation.activityDate}}</p>
      {{#if reservation.schedule}}<p style="margin:4px 0;"><strong>Horario:</strong> {{reservation.schedule}}</p>{{/if}}
      <p style="margin:4px 0;"><strong>Total:</strong> {{formatMoney reservation.totalPrice}}</p>
    </div>

    <h3 style="font-size:14px;">Qué llevar</h3>
    <ul style="font-size:13px;color:#2D2A26;">
      <li>Ropa de abrigo, gorro y guantes</li>
      <li>Crema solar y gafas de sol</li>
      <li>DNI o pasaporte de cada participante</li>
      <li>Confirmación impresa o en el móvil</li>
    </ul>

    {{#if reservation.notes}}<div class="panel" style="margin-top:16px;"><strong>Notas:</strong> {{reservation.notes}}</div>{{/if}}

    <div class="footer">
      {{#if branding.supportEmail}}<p>¿Necesitas ayuda? Escríbenos a {{branding.supportEmail}}{{#if branding.supportPhone}} o llámanos al {{branding.supportPhone}}{{/if}}.</p>{{/if}}
      <p>Gracias por confiar en {{branding.businessName}}. ¡Nos vemos en la nieve!</p>
    </div>
  </div>
</body>
</html>`,
  variables: [
    { key: "reservation.clientName", label: "Nombre del cliente" },
    { key: "reservation.station", label: "Estación" },
    { key: "reservation.activityDate", label: "Fecha de actividad" },
    { key: "reservation.schedule", label: "Horario" },
    { key: "reservation.totalPrice", label: "Precio total" },
    { key: "reservation.notes", label: "Notas" },
  ],
};

const BOOKING_REMINDER: DefaultTemplate = {
  type: "booking_reminder",
  name: "Recordatorio de reserva — Plantilla por defecto",
  subject: "Tu actividad es pronto — {{branding.businessName}}",
  htmlBody: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">{{branding.businessName}}</div>
      <span class="badge">Recordatorio</span>
    </div>
    <h1 style="font-size:22px;">{{reservation.clientName}}, tu reserva es pronto</h1>
    <p>Te escribimos para recordarte los detalles:</p>
    <div class="panel">
      <p><strong>Estación:</strong> {{reservation.station}}</p>
      <p><strong>Fecha:</strong> {{formatDate reservation.activityDate}}</p>
      {{#if reservation.schedule}}<p><strong>Horario:</strong> {{reservation.schedule}}</p>{{/if}}
    </div>
    <p style="margin-top:16px;">Recuerda llegar con 15 minutos de antelación.</p>
    <div class="footer">{{#if branding.supportPhone}}<p>Si necesitas reprogramar, llámanos al {{branding.supportPhone}}.</p>{{/if}}</div>
  </div>
</body>
</html>`,
  variables: [
    { key: "reservation.clientName", label: "Nombre del cliente" },
    { key: "reservation.station", label: "Estación" },
    { key: "reservation.activityDate", label: "Fecha de actividad" },
    { key: "reservation.schedule", label: "Horario" },
  ],
};

const WELCOME_EMAIL: DefaultTemplate = {
  type: "welcome_email",
  name: "Bienvenida — Plantilla por defecto",
  subject: "Bienvenido a {{branding.businessName}}",
  htmlBody: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">{{branding.businessName}}</div>
    </div>
    <h1 style="font-size:24px;">Hola {{user.name}}, bienvenido</h1>
    <p>Gracias por unirte a {{branding.businessName}}. Estamos a tu disposición para ayudarte a planificar tu próxima escapada a la nieve.</p>
    <p style="margin:24px 0;"><a class="btn" href="{{branding.website}}">Explorar destinos</a></p>
    <div class="footer">
      <p>Si tienes cualquier duda, responde a este correo y nuestro equipo te atenderá.</p>
    </div>
  </div>
</body>
</html>`,
  variables: [
    { key: "user.name", label: "Nombre del usuario" },
  ],
};

const SETTLEMENT_PDF: DefaultTemplate = {
  type: "settlement_pdf",
  name: "Liquidación de proveedor — Plantilla por defecto",
  htmlBody: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>Liquidación {{settlement.id}}</title><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">{{branding.businessName}}</div>
        {{#if branding.cif}}<div style="font-size:11px;color:#8A8580;">CIF {{branding.cif}}</div>{{/if}}
      </div>
      <div class="meta">
        <div><strong>Liquidación</strong></div>
        <div>Nº {{settlement.id}}</div>
        <div>Periodo: {{formatDate settlement.periodStart}} – {{formatDate settlement.periodEnd}}</div>
      </div>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <strong>Proveedor</strong>
      <div>{{settlement.supplierName}}</div>
      {{#if settlement.supplierCif}}<div style="font-size:13px;color:#8A8580;">CIF {{settlement.supplierCif}}</div>{{/if}}
    </div>

    <table>
      <thead>
        <tr><th>Concepto</th><th style="text-align:right;">Importe</th></tr>
      </thead>
      <tbody>
        {{#each settlement.items}}
        <tr><td>{{description}}</td><td style="text-align:right;">{{formatMoney amount}}</td></tr>
        {{/each}}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Total bruto</span><span>{{formatMoney settlement.total}}</span></div>
      <div class="row"><span>Comisión ({{settlement.commissionPct}}%)</span><span>−{{formatMoney settlement.commission}}</span></div>
      <div class="row grand"><span>Neto a abonar</span><span>{{formatMoney settlement.net}}</span></div>
    </div>

    <div class="footer">
      <p>Importes en EUR. Documento generado automáticamente.</p>
    </div>
  </div>
</body>
</html>`,
  variables: [
    { key: "settlement.id", label: "ID liquidación" },
    { key: "settlement.supplierName", label: "Nombre proveedor" },
    { key: "settlement.supplierCif", label: "CIF proveedor" },
    { key: "settlement.periodStart", label: "Inicio periodo" },
    { key: "settlement.periodEnd", label: "Fin periodo" },
    { key: "settlement.total", label: "Total bruto" },
    { key: "settlement.commissionPct", label: "% comisión" },
    { key: "settlement.commission", label: "Importe comisión" },
    { key: "settlement.net", label: "Neto a abonar" },
    { key: "settlement.items", label: "Líneas (lista)" },
  ],
};

export const DEFAULT_TEMPLATES: Record<DocumentType, DefaultTemplate> = {
  quote_pdf: QUOTE_PDF,
  invoice_pdf: INVOICE_PDF,
  booking_confirmation: BOOKING_CONFIRMATION,
  booking_reminder: BOOKING_REMINDER,
  welcome_email: WELCOME_EMAIL,
  settlement_pdf: SETTLEMENT_PDF,
};

export function getDefaultTemplate(type: DocumentType): DefaultTemplate {
  return DEFAULT_TEMPLATES[type];
}

export function getSampleContext(type: DocumentType): Record<string, unknown> {
  switch (type) {
    case "quote_pdf":
      return {
        quote: {
          id: "PRES-2026-0042",
          clientName: "Lucía Fernández",
          clientEmail: "lucia@ejemplo.com",
          clientPhone: "+34 600 123 456",
          totalAmount: 845.5,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 86400000),
          items: [
            { name: "Forfait 3 días — Baqueira", description: "Adulto, temporada media", quantity: 2, unitPrice: 168, totalPrice: 336 },
            { name: "Alquiler equipo gama media (3 días)", description: "Esquís + botas + bastones", quantity: 2, unitPrice: 108, totalPrice: 216 },
            { name: "Clase particular 2h", description: "Nivel B, idioma español", quantity: 1, unitPrice: 140, totalPrice: 140 },
          ],
        },
      };
    case "invoice_pdf":
      return {
        invoice: {
          number: "F-2026/0123",
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 14 * 86400000),
          clientName: "Skicenter Travel S.L.",
          clientCif: "B12345678",
          clientAddress: "C/ Mayor 12, Madrid",
          subtotal: 1000,
          taxRate: 21,
          taxAmount: 210,
          total: 1210,
          paymentInfo: "Transferencia a IBAN ES12 3456 7890 1234 5678",
          items: [
            { name: "Pack escapada 4 días — Sierra Nevada", quantity: 4, unitPrice: 250, totalPrice: 1000 },
          ],
        },
      };
    case "booking_confirmation":
    case "booking_reminder":
      return {
        reservation: {
          clientName: "Marta García",
          station: "Baqueira Beret",
          activityDate: new Date(Date.now() + 5 * 86400000),
          schedule: "10:00 – 13:00",
          totalPrice: 320,
          notes: "Llegar 15 min antes a la oficina central.",
        },
      };
    case "welcome_email":
      return { user: { name: "Marta" } };
    case "settlement_pdf":
      return {
        settlement: {
          id: "LIQ-2026-007",
          supplierName: "Escuela Snow Pro",
          supplierCif: "B98765432",
          periodStart: new Date(Date.now() - 30 * 86400000),
          periodEnd: new Date(),
          total: 4800,
          commissionPct: 15,
          commission: 720,
          net: 4080,
          items: [
            { description: "Clases particulares — semana 1", amount: 1200 },
            { description: "Clases particulares — semana 2", amount: 1600 },
            { description: "Cursillos infantiles", amount: 2000 },
          ],
        },
      };
  }
}
