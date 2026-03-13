"use client";

import { Badge } from "@/components/ui/badge";

interface SourceFilterProps {
  sources: string[];
  selected: string | null;
  onSelect: (source: string | null) => void;
}

export function SourceFilter({ sources, selected, onSelect }: SourceFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect(null)}
        type="button"
      >
        <Badge variant={selected === null ? "default" : "outline"}>All</Badge>
      </button>
      {sources.map((source) => (
        <button
          key={source}
          onClick={() => onSelect(source === selected ? null : source)}
          type="button"
        >
          <Badge variant={source === selected ? "default" : "outline"}>
            {source}
          </Badge>
        </button>
      ))}
    </div>
  );
}
