"use client";

import { useState, useMemo } from "react";
import { Users } from "lucide-react";
import { useContacts } from "@/hooks/useGHL";
import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContactsTable } from "./_components/ContactsTable";
import { ContactsSearch } from "./_components/ContactsSearch";
import { SourceFilter } from "./_components/SourceFilter";

export default function ContactsPage() {
  const { data, isLoading } = useContacts();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const contacts = useMemo(() => data?.contacts ?? [], [data]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts) {
      if (c.source) set.add(c.source);
    }
    return Array.from(set).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      const matchesSearch =
        !q ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));

      const matchesSource = !sourceFilter || c.source === sourceFilter;

      return matchesSearch && matchesSource;
    });
  }, [contacts, search, sourceFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {contacts.length} contacts
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ContactsSearch value={search} onChange={setSearch} />
        {sources.length > 0 && (
          <SourceFilter
            sources={sources}
            selected={sourceFilter}
            onSelect={setSourceFilter}
          />
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description={
            search || sourceFilter
              ? "Try adjusting your search or filters"
              : "Contacts will appear here once synced from GHL"
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-white">
          <ContactsTable contacts={filtered} />
        </div>
      )}
    </div>
  );
}
