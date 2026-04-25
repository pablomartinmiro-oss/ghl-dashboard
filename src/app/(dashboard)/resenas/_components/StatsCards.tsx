"use client";

import { Star, MessageSquare, Clock, Sparkles } from "lucide-react";
import type { ReviewStats } from "@/hooks/useReviews";
import { StarRating } from "./StarRating";

interface StatsCardsProps {
  stats: ReviewStats | undefined;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const avg = stats?.avgRating ?? 0;
  const total = stats?.total ?? 0;
  const pending = stats?.pending ?? 0;
  const featured = stats?.featured ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card icon={<Star className="h-4 w-4 text-coral" />} label="Valoración media">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-text-primary">
            {avg.toFixed(1)}
          </span>
          <span className="text-sm text-text-secondary">/ 5</span>
        </div>
        <div className="mt-1.5">
          <StarRating value={avg} size="md" />
        </div>
      </Card>

      <Card icon={<MessageSquare className="h-4 w-4 text-coral" />} label="Total reseñas">
        <div className="text-3xl font-semibold text-text-primary">{total}</div>
        <p className="mt-1 text-xs text-text-secondary">Todas las reseñas recibidas</p>
      </Card>

      <Card icon={<Clock className="h-4 w-4 text-warning" />} label="Pendientes">
        <div className="text-3xl font-semibold text-text-primary">{pending}</div>
        <p className="mt-1 text-xs text-text-secondary">Esperando moderación</p>
      </Card>

      <Card icon={<Sparkles className="h-4 w-4 text-coral" />} label="Destacadas">
        <div className="text-3xl font-semibold text-text-primary">{featured}</div>
        <p className="mt-1 text-xs text-text-secondary">Visibles en la tienda</p>
      </Card>
    </div>
  );
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function Card({ icon, label, children }: CardProps) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-coral/10">
          {icon}
        </span>
        <span className="text-xs font-medium text-text-secondary">{label}</span>
      </div>
      {children}
    </div>
  );
}
