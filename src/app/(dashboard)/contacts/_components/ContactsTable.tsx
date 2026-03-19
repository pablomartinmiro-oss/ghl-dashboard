"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { GHLContact } from "@/lib/ghl/types";

type SortKey = "name" | "email" | "dateAdded";
type SortDir = "asc" | "desc";

interface ContactsTableProps {
  contacts: GHLContact[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="ml-1 inline h-3 w-3 text-text-secondary/50" />;
  return sortDir === "asc"
    ? <ArrowUp className="ml-1 inline h-3 w-3 text-coral" />
    : <ArrowDown className="ml-1 inline h-3 w-3 text-coral" />;
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("dateAdded");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...contacts].sort((a, b) => {
    let aVal = "";
    let bVal = "";
    if (sortKey === "name") {
      aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
      bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
    } else if (sortKey === "email") {
      aVal = (a.email ?? "").toLowerCase();
      bVal = (b.email ?? "").toLowerCase();
    } else {
      aVal = a.dateAdded;
      bVal = b.dateAdded;
    }
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <button onClick={() => toggleSort("name")} className="flex items-center font-medium hover:text-coral transition-colors">
              Nombre <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
            </button>
          </TableHead>
          <TableHead>
            <button onClick={() => toggleSort("email")} className="flex items-center font-medium hover:text-coral transition-colors">
              Email <SortIcon col="email" sortKey={sortKey} sortDir={sortDir} />
            </button>
          </TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Origen</TableHead>
          <TableHead>Etiquetas</TableHead>
          <TableHead>
            <button onClick={() => toggleSort("dateAdded")} className="flex items-center font-medium hover:text-coral transition-colors">
              Fecha <SortIcon col="dateAdded" sortKey={sortKey} sortDir={sortDir} />
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((contact) => (
          <TableRow key={contact.id}>
            <TableCell>
              <Link
                href={`/contacts/${contact.id}`}
                className="font-medium text-text-primary hover:text-coral hover:underline"
              >
                {contact.firstName} {contact.lastName}
              </Link>
            </TableCell>
            <TableCell>
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-text-secondary hover:text-coral transition-colors">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {contact.email}
                </a>
              ) : (
                <span className="text-text-secondary">—</span>
              )}
            </TableCell>
            <TableCell>
              {contact.phone ? (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-text-secondary hover:text-coral transition-colors">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {contact.phone}
                </a>
              ) : (
                <span className="text-text-secondary">—</span>
              )}
            </TableCell>
            <TableCell>
              <span className="text-text-secondary">
                {contact.source ?? "—"}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {contact.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
                {contact.tags.length > 3 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{contact.tags.length - 3}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-text-secondary">
              {formatDate(contact.dateAdded)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
