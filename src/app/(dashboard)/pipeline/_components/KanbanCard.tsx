"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GHLOpportunity } from "@/lib/ghl/types";

interface KanbanCardProps {
  opportunity: GHLOpportunity;
  isDragOverlay?: boolean;
  onClick?: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KanbanCard({ opportunity, isDragOverlay, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging && !isDragOverlay) onClick?.();
      }}
      className={cn(
        "rounded-lg border border-border/50 bg-surface p-3 transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        isDragOverlay && "shadow-lg ring-1 ring-coral/20 rotate-2"
      )}
    >
      <p className="mb-1 text-sm font-medium leading-tight text-text-primary">
        {opportunity.name}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-success">
          {formatCurrency(opportunity.monetaryValue)}
        </span>
        {opportunity.assignedTo && (
          <div className="flex items-center gap-1 text-[10px] text-text-secondary">
            <User className="h-3 w-3" />
            Asignado
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[10px] text-text-secondary">{opportunity.status}</p>
    </div>
  );
}
