"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, User } from "lucide-react";

interface ContactResult {
  id: string; // GHL contact ID (CachedContact.id IS the GHL ID)
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface ContactSearchPickerProps {
  onSelect: (contact: ContactResult) => void;
  onClear: () => void;
  selectedName?: string;
}

async function searchContacts(q: string): Promise<ContactResult[]> {
  if (!q.trim()) return [];
  const res = await fetch(`/api/crm/contacts?search=${encodeURIComponent(q)}&limit=10`);
  if (!res.ok) return [];
  const data = (await res.json()) as { contacts: ContactResult[] };
  return data.contacts ?? [];
}

export function ContactSearchPicker({ onSelect, onClear, selectedName }: ContactSearchPickerProps) {
  const [query, setQuery] = useState(selectedName ?? "");
  const [results, setResults] = useState<ContactResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(!!selectedName);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    setSelected(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const found = await searchContacts(value);
      setResults(found);
      setOpen(found.length > 0);
      setLoading(false);
    }, 250);
  };

  const handleSelect = (contact: ContactResult) => {
    setQuery(contact.name || `${contact.firstName} ${contact.lastName}`.trim());
    setSelected(true);
    setOpen(false);
    setResults([]);
    onSelect(contact);
  };

  const handleClear = () => {
    setQuery("");
    setSelected(false);
    setResults([]);
    setOpen(false);
    onClear();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Buscar contacto en GHL..."
          className="w-full rounded-lg border border-border bg-white pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-secondary hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {selected && (
        <p className="mt-1 text-xs text-sage font-medium">✓ Contacto GHL vinculado</p>
      )}

      {loading && (
        <div className="mt-1 text-xs text-text-secondary px-1">Buscando...</div>
      )}

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-56 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => handleSelect(c)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-warm-muted transition-colors"
              >
                <User className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {c.name || `${c.firstName} ${c.lastName}`.trim() || "Sin nombre"}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {[c.email, c.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
