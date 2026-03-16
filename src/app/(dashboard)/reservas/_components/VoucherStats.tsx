"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { formatEUR, formatDate } from "./constants";

interface VoucherStatsData {
  pendientes: number;
  canjeados: number;
  ingresosMes: number;
  caducanSemana: number;
  caducanMes: number;
  expiring: Array<{
    id: string;
    clientName: string;
    clientPhone: string;
    voucherExpiry: string;
    voucherCouponCode: string | null;
  }>;
}

export function VoucherStats() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useQuery<VoucherStatsData>({
    queryKey: ["voucher-stats"],
    queryFn: async () => {
      const res = await fetch("/api/reservations/voucher-stats");
      if (!res.ok) throw new Error("Failed to fetch voucher stats");
      return res.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading || !data) return null;

  const hasExpiring = data.caducanSemana > 0;

  return (
    <div className="space-y-2">
      {/* Expiry alert banner */}
      {hasExpiring && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
          <span className="text-sm text-yellow-800">
            {data.caducanSemana} {data.caducanSemana === 1 ? "cupón caduca" : "cupones caducan"} esta semana — contacta a estos clientes
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto shrink-0 text-yellow-600 hover:text-yellow-800"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Expiring vouchers list */}
      {expanded && data.expiring.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-yellow-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Cliente</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Teléfono</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Cupón</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Caduca</th>
              </tr>
            </thead>
            <tbody>
              {data.expiring.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{v.clientName}</td>
                  <td className="px-3 py-2 text-text-secondary">{v.clientPhone}</td>
                  <td className="px-3 py-2 font-mono text-xs">{v.voucherCouponCode ?? "—"}</td>
                  <td className="px-3 py-2 text-red-600 font-medium">{formatDate(v.voucherExpiry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 rounded-lg border border-border bg-white px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-text-primary">Cupones Groupon</span>
        <div className="flex flex-1 flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
            Pendientes: {data.pendientes}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Canjeados este mes: {data.canjeados}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            Ingresos: {formatEUR(data.ingresosMes)}
          </span>
          {data.caducanSemana > 0 && (
            <span className="flex items-center gap-1 text-yellow-700 font-medium">
              <AlertTriangle className="h-3 w-3" />
              Caducan semana: {data.caducanSemana}
            </span>
          )}
          {data.caducanMes > 0 && (
            <span className="text-text-secondary">
              Caducan mes: {data.caducanMes}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
      </button>
    </div>
  );
}
