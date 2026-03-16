"use client";

import { useRef } from "react";
import { X, Printer } from "lucide-react";
import type { Quote } from "@/hooks/useQuotes";
import { STATIONS } from "../../reservas/_components/constants";

interface EmailItem {
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

interface EmailPreviewModalProps {
  quote: Quote;
  items: EmailItem[];
  isOpen: boolean;
  onClose: () => void;
}

function getStationLabel(value: string): string {
  return STATIONS.find((s) => s.value === value)?.label ?? value;
}

export function EmailPreviewModal({ quote, items, isOpen, onClose }: EmailPreviewModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 5);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  const formatDate = (date: Date) =>
    date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Presupuesto — ${quote.clientName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', -apple-system, sans-serif; color: #2D2A26; }
  .header { background: linear-gradient(135deg, #E87B5A 0%, #D4A853 100%); padding: 32px; text-align: center; }
  .header h1 { color: white; font-size: 24px; letter-spacing: 2px; }
  .header p { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
  .body { padding: 32px; }
  .section { margin-bottom: 24px; }
  .greeting { font-size: 15px; line-height: 1.6; }
  .info-box { background: #FAF9F7; border-radius: 8px; padding: 16px; margin-top: 16px; }
  .info-box h3 { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px; }
  .info-grid .label { color: #8A8580; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 0; border-bottom: 2px solid #E8E4DE; font-weight: 600; }
  th.center { text-align: center; }
  th.right { text-align: right; }
  td { padding: 10px 0; border-bottom: 1px solid #E8E4DE; }
  td.center { text-align: center; color: #8A8580; }
  td.right { text-align: right; font-weight: 500; }
  .total-row { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #E87B5A; padding-top: 12px; margin-top: 12px; }
  .total-label { font-size: 16px; font-weight: 700; }
  .total-amount { font-size: 20px; font-weight: 700; color: #E87B5A; }
  .payment { background: #FAF9F7; border-radius: 8px; padding: 16px; font-size: 13px; }
  .payment ul { list-style: none; margin-top: 8px; }
  .payment li { margin-bottom: 4px; color: #8A8580; }
  .payment .expiry { color: #D4A853; font-weight: 500; font-size: 12px; margin-top: 8px; }
  .terms { font-size: 11px; color: #8A8580; line-height: 1.5; border-top: 1px solid #E8E4DE; padding-top: 16px; }
  .terms h4 { color: #2D2A26; font-weight: 600; margin-bottom: 4px; font-size: 12px; }
  .footer { background: linear-gradient(135deg, #E87B5A 0%, #D4A853 100%); border-radius: 12px; padding: 16px; text-align: center; color: white; font-size: 12px; margin-top: 24px; }
  .footer .company { font-weight: 600; }
  .footer .contact { opacity: 0.8; margin-top: 4px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header"><h1>SKICENTER</h1><p>Tu aventura en la nieve empieza aquí</p></div>
<div class="body">
  <div class="section greeting">
    <p>Hola <strong>${quote.clientName.split(" ")[0]}</strong>,</p>
    <p style="color:#8A8580;margin-top:8px">Encantados de saludarte. Te enviamos presupuesto para vuestra estancia en <strong>${getStationLabel(quote.destination)}</strong> del <strong>${formatDate(new Date(quote.checkIn))}</strong> al <strong>${formatDate(new Date(quote.checkOut))}</strong>.</p>
  </div>
  <div class="section info-box">
    <h3>Datos del cliente</h3>
    <div class="info-grid">
      <div><span class="label">Nombre: </span>${quote.clientName}</div>
      ${quote.clientPhone ? `<div><span class="label">Teléfono: </span>${quote.clientPhone}</div>` : ""}
      ${quote.clientEmail ? `<div><span class="label">Email: </span>${quote.clientEmail}</div>` : ""}
      <div><span class="label">Personas: </span>${quote.adults} adultos${quote.children > 0 ? `, ${quote.children} niños` : ""}</div>
    </div>
  </div>
  <div class="section">
    <table><thead><tr><th>Descripción</th><th class="center" style="width:60px">Cant.</th><th class="center" style="width:60px">Dto.</th><th class="right" style="width:90px">Precio</th></tr></thead>
    <tbody>${items.map((item) => `<tr><td><strong>${item.name}</strong>${item.description ? `<br/><span style="font-size:11px;color:#8A8580">${item.description}</span>` : ""}</td><td class="center">${item.quantity}</td><td class="center">${item.discount > 0 ? `${item.discount}%` : "-"}</td><td class="right">${formatCurrency(item.totalPrice)}</td></tr>`).join("")}</tbody></table>
    <div class="total-row"><span class="total-label">TOTAL</span><span class="total-amount">${formatCurrency(totalAmount)}</span></div>
  </div>
  <div class="section payment">
    <p style="font-weight:500">Formas de pago:</p>
    <ul><li>• Transferencia bancaria: ES12 3456 7890 1234 5678 9012</li><li>• Enlace de pago: se enviará tras la confirmación</li></ul>
    <p class="expiry">Este presupuesto tiene validez hasta el ${formatDate(expiryDate)}.</p>
  </div>
  <div class="section terms"><h4>Términos y condiciones:</h4><p>El presupuesto incluye IVA. Los precios pueden variar según disponibilidad. La reserva se confirma con el pago del 30% del total. Cancelación gratuita hasta 15 días antes de la llegada. Para cancelaciones posteriores se aplicará una penalización del 50%. No shows: 100% del importe.</p></div>
  <div class="footer"><p class="company">Skicenter Spain</p><p class="contact">info@skicenter.es · +34 900 123 456 · www.skicenter.es</p></div>
</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[14px] bg-white shadow-xl">
        {/* Action buttons */}
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="rounded-lg bg-white p-1.5 shadow-sm hover:bg-surface transition-colors"
            title="Imprimir / Guardar PDF"
          >
            <Printer className="h-5 w-5 text-coral" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-white p-1.5 shadow-sm hover:bg-surface transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Email content */}
        <div ref={printRef} className="p-0">
          {/* Header banner */}
          <div
            className="px-8 py-6 text-center"
            style={{
              background: "linear-gradient(135deg, #E87B5A 0%, #D4A853 100%)",
            }}
          >
            <h1 className="text-2xl font-bold text-white tracking-wide">SKICENTER</h1>
            <p className="text-sm text-white/80 mt-1">Tu aventura en la nieve empieza aquí</p>
          </div>

          <div className="px-8 py-6 space-y-6">
            {/* Greeting */}
            <div>
              <p className="text-base text-text-primary">
                Hola <strong>{quote.clientName.split(" ")[0]}</strong>,
              </p>
              <p className="text-sm text-text-secondary mt-2">
                Encantados de saludarte. Te enviamos presupuesto para vuestra estancia
                en <strong>{getStationLabel(quote.destination)}</strong> del{" "}
                <strong>{formatDate(new Date(quote.checkIn))}</strong> al{" "}
                <strong>{formatDate(new Date(quote.checkOut))}</strong>.
              </p>
            </div>

            {/* Payment info */}
            <div className="rounded-lg bg-surface p-4">
              <p className="text-sm font-medium text-text-primary mb-2">Formas de pago:</p>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Transferencia bancaria: ES12 3456 7890 1234 5678 9012</li>
                <li>• Enlace de pago: se enviará tras la confirmación</li>
              </ul>
              <p className="text-xs text-warning mt-2 font-medium">
                Este presupuesto tiene validez hasta el {formatDate(expiryDate)}.
              </p>
            </div>

            {/* Client info */}
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Datos del cliente</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-text-secondary">Nombre: </span>
                  <span className="text-text-primary">{quote.clientName}</span>
                </div>
                {quote.clientPhone && (
                  <div>
                    <span className="text-text-secondary">Teléfono: </span>
                    <span className="text-text-primary">{quote.clientPhone}</span>
                  </div>
                )}
                {quote.clientEmail && (
                  <div>
                    <span className="text-text-secondary">Email: </span>
                    <span className="text-text-primary">{quote.clientEmail}</span>
                  </div>
                )}
                <div>
                  <span className="text-text-secondary">Personas: </span>
                  <span className="text-text-primary">
                    {quote.adults} adultos{quote.children > 0 ? `, ${quote.children} niños` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="py-2 text-left font-semibold text-text-primary">Descripción</th>
                    <th className="py-2 text-center font-semibold text-text-primary w-16">Cant.</th>
                    <th className="py-2 text-center font-semibold text-text-primary w-16">Dto.</th>
                    <th className="py-2 text-right font-semibold text-text-primary w-24">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5">
                        <div className="font-medium text-text-primary">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-text-secondary">{item.description}</div>
                        )}
                      </td>
                      <td className="py-2.5 text-center text-text-secondary">{item.quantity}</td>
                      <td className="py-2.5 text-center text-text-secondary">
                        {item.discount > 0 ? `${item.discount}%` : "-"}
                      </td>
                      <td className="py-2.5 text-right font-medium text-text-primary">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div className="mt-3 flex justify-between items-center border-t-2 border-coral pt-3">
                <span className="text-base font-bold text-text-primary">TOTAL</span>
                <span className="text-xl font-bold text-coral">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Terms */}
            <div className="text-xs text-text-secondary space-y-1 border-t border-border pt-4">
              <p className="font-semibold text-text-primary">Términos y condiciones:</p>
              <p>
                El presupuesto incluye IVA. Los precios pueden variar según disponibilidad.
                La reserva se confirma con el pago del 30% del total. Cancelación gratuita
                hasta 15 días antes de la llegada. Para cancelaciones posteriores se aplicará
                una penalización del 50%. No shows: 100% del importe.
              </p>
            </div>

            {/* Footer */}
            <div
              className="rounded-2xl px-6 py-4 text-center text-white text-xs"
              style={{
                background: "linear-gradient(135deg, #E87B5A 0%, #D4A853 100%)",
              }}
            >
              <p className="font-semibold">Skicenter Spain</p>
              <p className="mt-1 opacity-80">
                info@skicenter.es · +34 900 123 456 · www.skicenter.es
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
