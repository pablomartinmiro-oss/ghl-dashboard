"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ContactsSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ContactsSearch({ value, onChange }: ContactsSearchProps) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
      <Input
        placeholder="Buscar contactos..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border-border bg-white pl-9 placeholder:text-text-secondary"
      />
    </div>
  );
}
