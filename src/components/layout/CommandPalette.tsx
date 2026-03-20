"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Columns3,
  CalendarDays,
  FileText,
  ShoppingBag,
  Settings,
  Plus,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  section: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const nav = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  const commands: Command[] = useMemo(
    () => [
      // Navigation
      { id: "nav-dash", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, section: "Navegar", action: () => nav("/"), keywords: ["inicio", "home"] },
      { id: "nav-contacts", label: "Contactos", icon: <Users className="h-4 w-4" />, section: "Navegar", action: () => nav("/contacts"), keywords: ["clientes"] },
      { id: "nav-comms", label: "Comunicaciones", icon: <MessageSquare className="h-4 w-4" />, section: "Navegar", action: () => nav("/comms"), keywords: ["mensajes", "whatsapp", "chat"] },
      { id: "nav-pipeline", label: "Pipeline", icon: <Columns3 className="h-4 w-4" />, section: "Navegar", action: () => nav("/pipeline"), keywords: ["kanban", "oportunidades", "ventas"] },
      { id: "nav-reservas", label: "Reservas", icon: <CalendarDays className="h-4 w-4" />, section: "Navegar", action: () => nav("/reservas"), keywords: ["booking"] },
      { id: "nav-presupuestos", label: "Presupuestos", icon: <FileText className="h-4 w-4" />, section: "Navegar", action: () => nav("/presupuestos"), keywords: ["quotes", "cotización"] },
      { id: "nav-catalogo", label: "Catálogo", icon: <ShoppingBag className="h-4 w-4" />, section: "Navegar", action: () => nav("/catalogo"), keywords: ["productos", "precios"] },
      { id: "nav-settings", label: "Ajustes", icon: <Settings className="h-4 w-4" />, section: "Navegar", action: () => nav("/settings"), keywords: ["configuración", "config"] },

      // Quick Actions
      { id: "act-new-reserva", label: "Nueva reserva", icon: <Plus className="h-4 w-4" />, section: "Acciones", action: () => nav("/reservas"), keywords: ["crear reserva"] },
      { id: "act-new-quote", label: "Nuevo presupuesto", icon: <Plus className="h-4 w-4" />, section: "Acciones", action: () => nav("/presupuestos"), keywords: ["crear presupuesto"] },
    ],
    [nav]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.includes(q))
    );
  }, [commands, query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIdx(0);
  }, [filtered.length]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setQuery("");
            setSelectedIdx(0);
          }
          return !prev;
        });
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Arrow keys + Enter
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIdx]) {
      e.preventDefault();
      filtered[selectedIdx].action();
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  // Group by section
  const sections: { label: string; items: (Command & { globalIdx: number })[] }[] = [];
  filtered.forEach((cmd, i) => {
    const last = sections[sections.length - 1];
    if (last && last.label === cmd.section) {
      last.items.push({ ...cmd, globalIdx: i });
    } else {
      sections.push({ label: cmd.section, items: [{ ...cmd, globalIdx: i }] });
    }
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] z-[61] w-full max-w-lg -translate-x-1/2 rounded-2xl border border-[#E8E4DE] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.15)]">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[#E8E4DE] px-4 py-3">
          <Search className="h-4.5 w-4.5 shrink-0 text-[#8A8580]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar o ir a..."
            className="flex-1 bg-transparent text-sm text-[#2D2A26] placeholder:text-[#8A8580] outline-none"
          />
          <kbd className="hidden rounded-md border border-[#E8E4DE] px-1.5 py-0.5 text-[10px] font-medium text-[#8A8580] sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#8A8580]">
              Sin resultados
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.label} className="py-1">
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8A8580]">
                  {section.label}
                </div>
                {section.items.map((cmd) => (
                  <button
                    key={cmd.id}
                    data-idx={cmd.globalIdx}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIdx(cmd.globalIdx)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      cmd.globalIdx === selectedIdx
                        ? "bg-[#E87B5A]/10 text-[#E87B5A]"
                        : "text-[#2D2A26] hover:bg-[#FAF9F7]"
                    )}
                  >
                    <span className="shrink-0 opacity-70">{cmd.icon}</span>
                    <span className="flex-1 text-sm font-medium">{cmd.label}</span>
                    {cmd.globalIdx === selectedIdx && (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[#E8E4DE] px-4 py-2 text-[10px] text-[#8A8580]">
          <span>↑↓ navegar</span>
          <span>↵ seleccionar</span>
          <span>esc cerrar</span>
        </div>
      </div>
    </>
  );
}
