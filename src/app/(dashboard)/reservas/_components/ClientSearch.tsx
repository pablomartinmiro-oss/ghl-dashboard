"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import type { Reservation } from "@/hooks/useReservations";

interface ClientInfo {
  name: string;
  phone: string;
  email: string;
}

interface ClientSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (client: ClientInfo) => void;
  reservations: Reservation[] | undefined;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ClientSearch({ value, onChange, onSelect, reservations, inputRef }: ClientSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Deduplicate clients by name (case-insensitive), keep most recent
  const knownClients = useMemo(() => {
    if (!reservations) return [];
    const map = new Map<string, ClientInfo>();
    for (const r of reservations) {
      const key = r.clientName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: r.clientName, phone: r.clientPhone, email: r.clientEmail });
      }
    }
    return Array.from(map.values());
  }, [reservations]);

  const matches = useMemo(() => {
    if (!value || value.length < 2) return [];
    const q = value.toLowerCase();
    return knownClients
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [value, knownClients]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-xs text-text-secondary">Nombre completo *</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => { if (value.length >= 2) setIsOpen(true); }}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          autoComplete="off"
        />
        {knownClients.length > 0 && (
          <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary/50" />
        )}
      </div>
      {isOpen && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-48 overflow-y-auto">
          {matches.map((client, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(client); setIsOpen(false); }}
              className="flex w-full flex-col px-3 py-2 text-left hover:bg-surface transition-colors"
            >
              <span className="text-sm font-medium text-text-primary">{client.name}</span>
              <span className="text-xs text-text-secondary">{client.phone} · {client.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
