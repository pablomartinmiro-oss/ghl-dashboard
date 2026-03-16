"use client";

import { useMutation } from "@tanstack/react-query";

export interface VoucherData {
  producto: string;
  codigoSeguridad: string;
  codigoCupon: string;
  precioOriginal: number;
  precioGroupon: number;
  descuento: number;
  cantidadPagada: number;
  caduca: string;
  cantidad: number;
  serviciosDetectados: {
    tipo: string;
    duracion: string;
    equipo: boolean;
    casco: boolean;
    tipoPersona: string;
  };
}

export function useReadVoucher() {
  return useMutation({
    mutationFn: async ({ image, mediaType }: { image: string; mediaType: string }) => {
      const res = await fetch("/api/voucher/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al leer el cupón");
      }
      return res.json() as Promise<{ voucher: VoucherData }>;
    },
  });
}
