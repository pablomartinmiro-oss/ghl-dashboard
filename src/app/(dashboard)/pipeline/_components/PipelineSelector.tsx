"use client";

import { Badge } from "@/components/ui/badge";
import type { GHLPipeline } from "@/lib/ghl/types";

interface PipelineSelectorProps {
  pipelines: GHLPipeline[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PipelineSelector({
  pipelines,
  selectedId,
  onSelect,
}: PipelineSelectorProps) {
  if (pipelines.length <= 1) return null;

  return (
    <div className="flex gap-2">
      {pipelines.map((p) => (
        <button key={p.id} onClick={() => onSelect(p.id)} type="button">
          <Badge variant={p.id === selectedId ? "default" : "outline"}>
            {p.name}
          </Badge>
        </button>
      ))}
    </div>
  );
}
