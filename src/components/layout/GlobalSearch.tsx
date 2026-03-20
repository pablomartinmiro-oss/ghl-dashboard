"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  User,
  CalendarDays,
  FileText,
  Loader2,
} from "lucide-react";

interface SearchResult {
  contacts: Array<{ id: string; name: string | null; email: string | null; phone: string | null }>;
  reservations: Array<{ id: string; clientName: string; station: string; status: string; activityDate: string }>;
  quotes: Array<{ id: string; clientName: string; destination: string; status: string; totalAmount: number }>;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = (await res.json()) as SearchResult;
        setResults(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    setOpen(true);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(val.trim()), 250);
  }

  function navigate(path: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(path);
  }

  const total =
    (results?.contacts.length ?? 0) +
    (results?.reservations.length ?? 0) +
    (results?.quotes.length ?? 0);

  return (
    <div ref={ref} className="relative max-w-md flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Buscar contactos, reservas, presupuestos..."
        className="h-9 w-full rounded-[10px] border border-[#E8E4DE] bg-[#FAF9F7] pl-9 pr-8 text-sm text-[#2D2A26] placeholder:text-[#8A8580] outline-none focus:border-[#E87B5A] focus:ring-1 focus:ring-[#E87B5A]/30"
      />
      {query && (
        <button
          onClick={() => { setQuery(""); setResults(null); setOpen(false); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-[#E8E4DE]"
        >
          <X className="h-3.5 w-3.5 text-[#8A8580]" />
        </button>
      )}

      {open && query.length >= 2 && (
        <div className="absolute left-0 top-11 z-50 w-full rounded-2xl border border-[#E8E4DE] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          {loading && !results ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#8A8580]" />
            </div>
          ) : total === 0 ? (
            <div className="py-6 text-center text-sm text-[#8A8580]">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto py-1">
              {/* Contacts */}
              {results && results.contacts.length > 0 && (
                <ResultSection
                  label="Contactos"
                  icon={<User className="h-3.5 w-3.5" />}
                >
                  {results.contacts.map((c) => (
                    <ResultItem
                      key={c.id}
                      onClick={() => navigate(`/contacts/${c.id}`)}
                      title={c.name ?? "Sin nombre"}
                      subtitle={c.email ?? c.phone ?? ""}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Reservations */}
              {results && results.reservations.length > 0 && (
                <ResultSection
                  label="Reservas"
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                >
                  {results.reservations.map((r) => (
                    <ResultItem
                      key={r.id}
                      onClick={() => navigate("/reservas")}
                      title={r.clientName}
                      subtitle={`${r.station.replace(/_/g, " ")} · ${new Date(r.activityDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
                      badge={r.status}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Quotes */}
              {results && results.quotes.length > 0 && (
                <ResultSection
                  label="Presupuestos"
                  icon={<FileText className="h-3.5 w-3.5" />}
                >
                  {results.quotes.map((q) => (
                    <ResultItem
                      key={q.id}
                      onClick={() => navigate("/presupuestos")}
                      title={q.clientName}
                      subtitle={`${q.destination.replace(/_/g, " ")} · ${q.totalAmount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`}
                      badge={q.status}
                    />
                  ))}
                </ResultSection>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8A8580]">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  confirmada: "bg-[#5B8C6D]/15 text-[#5B8C6D]",
  pendiente: "bg-[#D4A853]/15 text-[#D4A853]",
  borrador: "bg-[#D4A853]/15 text-[#D4A853]",
  pagado: "bg-[#5B8C6D]/15 text-[#5B8C6D]",
  enviado: "bg-[#5B8C6D]/15 text-[#5B8C6D]",
  cancelada: "bg-[#8A8580]/15 text-[#8A8580]",
  cancelado: "bg-[#8A8580]/15 text-[#8A8580]",
  sin_disponibilidad: "bg-[#C75D4A]/15 text-[#C75D4A]",
};

function ResultItem({
  title,
  subtitle,
  badge,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-[#FAF9F7]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#2D2A26]">{title}</p>
        <p className="truncate text-xs text-[#8A8580]">{subtitle}</p>
      </div>
      {badge && (
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[badge] ?? "bg-[#8A8580]/15 text-[#8A8580]"}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
