"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Upload, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useReadVoucher, type VoucherData } from "@/hooks/useVoucher";
import { formatEUR } from "./constants";

interface VoucherSectionProps {
  onVoucherRead: (data: VoucherData) => void;
  securityCode: string;
  couponCode: string;
  product: string;
  pricePaid: string;
  expiry: string;
  redeemed: boolean;
  onFieldChange: (field: string, value: string | boolean) => void;
}

export function VoucherSection({
  onVoucherRead,
  securityCode,
  couponCode,
  product,
  pricePaid,
  expiry,
  redeemed,
  onFieldChange,
}: VoucherSectionProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readVoucher = useReadVoucher();

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten imágenes");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("La imagen es demasiado grande (máx 10MB)");
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        try {
          const result = await readVoucher.mutateAsync({
            image: base64,
            mediaType: file.type,
          });
          onVoucherRead(result.voucher);
          toast.success("Cupón leído correctamente — verifica los datos");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Error al leer el cupón");
        }
      };
      reader.readAsDataURL(file);
    },
    [readVoucher, onVoucherRead]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const hasData = !!(securityCode || couponCode || product);

  return (
    <fieldset className="space-y-3 rounded-lg border-2 border-dashed border-cyan/30 bg-cyan-light/30 p-4">
      <legend className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Upload className="h-4 w-4" />
        ESCANEAR CUPÓN
      </legend>

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-cyan bg-cyan-light"
            : "border-border bg-white hover:border-cyan/50"
        }`}
      >
        {readVoucher.isPending ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-cyan" />
            <span className="text-sm text-text-secondary">Leyendo cupón...</span>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-text-secondary/50" />
            <p className="mt-2 text-sm text-text-secondary">
              Arrastra la imagen del cupón aquí o haz clic para seleccionar
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-secondary">o introduce los datos manualmente</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Manual fields */}
      <div className="space-y-2">
        {/* Security Code */}
        <div className="flex items-center gap-2">
          <label className="w-40 shrink-0 text-xs text-text-secondary">Código de seguridad:</label>
          <input
            type="text"
            value={securityCode}
            onChange={(e) => onFieldChange("voucherSecurityCode", e.target.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan ${
              hasData && securityCode ? "border-green-300 bg-green-50" : "border-border bg-white"
            }`}
          />
          {securityCode && (
            <button
              type="button"
              onClick={() => handleCopy(securityCode, "security")}
              className="shrink-0 rounded p-1.5 hover:bg-gray-100"
              title="Copiar"
            >
              {copiedField === "security" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-text-secondary" />
              )}
            </button>
          )}
        </div>

        {/* Coupon Code */}
        <div className="flex items-center gap-2">
          <label className="w-40 shrink-0 text-xs text-text-secondary">Código de cupón:</label>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => onFieldChange("voucherCouponCode", e.target.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan ${
              hasData && couponCode ? "border-green-300 bg-green-50" : "border-border bg-white"
            }`}
          />
          {couponCode && (
            <button
              type="button"
              onClick={() => handleCopy(couponCode, "coupon")}
              className="shrink-0 rounded p-1.5 hover:bg-gray-100"
              title="Copiar"
            >
              {copiedField === "coupon" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-text-secondary" />
              )}
            </button>
          )}
        </div>

        {/* Product */}
        <div className="flex items-center gap-2">
          <label className="w-40 shrink-0 text-xs text-text-secondary">Producto:</label>
          <input
            type="text"
            value={product}
            onChange={(e) => onFieldChange("voucherProduct", e.target.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan ${
              hasData && product ? "border-green-300 bg-green-50" : "border-border bg-white"
            }`}
          />
        </div>

        {/* Price Paid */}
        <div className="flex items-center gap-2">
          <label className="w-40 shrink-0 text-xs text-text-secondary">Precio pagado:</label>
          <input
            type="number"
            step="0.01"
            value={pricePaid}
            onChange={(e) => onFieldChange("voucherPricePaid", e.target.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan ${
              hasData && pricePaid ? "border-green-300 bg-green-50" : "border-border bg-white"
            }`}
          />
          {pricePaid && (
            <span className="text-sm font-medium text-green-700">
              {formatEUR(Number(pricePaid))}
            </span>
          )}
        </div>

        {/* Expiry */}
        <div className="flex items-center gap-2">
          <label className="w-40 shrink-0 text-xs text-text-secondary">Caduca:</label>
          <input
            type="date"
            value={expiry}
            onChange={(e) => onFieldChange("voucherExpiry", e.target.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan ${
              hasData && expiry ? "border-green-300 bg-green-50" : "border-border bg-white"
            }`}
          />
        </div>
      </div>

      {/* Validate in Groupon button */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-cyan text-cyan hover:bg-cyan-light"
        onClick={() => window.open("https://merchant.groupon.es", "_blank")}
      >
        <ExternalLink className="h-4 w-4" />
        VALIDAR EN GROUPON
        <span className="text-xs opacity-60">(abre nueva pestaña)</span>
      </Button>

      {/* Redeemed checkbox */}
      <label className="flex items-center gap-2 rounded-lg bg-white p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={redeemed}
          onChange={(e) => onFieldChange("voucherRedeemed", e.target.checked)}
          className="h-5 w-5 rounded border-border accent-green-600"
        />
        <CheckCircle2 className={`h-5 w-5 ${redeemed ? "text-green-600" : "text-text-secondary/40"}`} />
        <span className={`text-sm font-medium ${redeemed ? "text-green-700" : "text-text-secondary"}`}>
          Cupón canjeado en Groupon
        </span>
      </label>
    </fieldset>
  );
}
