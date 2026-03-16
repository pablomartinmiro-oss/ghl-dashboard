"use client";

import { Building2, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TenantInfoCardProps {
  name: string;
  slug: string;
  createdAt: string;
  loading: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function TenantInfoCard({
  name,
  slug,
  createdAt,
  loading,
}: TenantInfoCardProps) {
  if (loading) {
    return (
      <div className="rounded-[14px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-1 h-4 w-48" />
        <Skeleton className="mt-4 h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <h3 className="mb-1 text-base font-semibold text-text-primary">Cuenta</h3>
      <p className="mb-4 text-sm text-text-secondary">Información de tu cuenta</p>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-text-secondary" />
          <span className="font-medium text-text-primary">{name}</span>
          <span className="text-text-secondary">({slug})</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Calendar className="h-4 w-4" />
          Creado el {formatDate(createdAt)}
        </div>
      </div>
    </div>
  );
}
