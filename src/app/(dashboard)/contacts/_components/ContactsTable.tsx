"use client";

import Link from "next/link";
import { Mail, Phone } from "lucide-react";
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

interface ContactsTableProps {
  contacts: GHLContact[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Date Added</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => (
          <TableRow key={contact.id}>
            <TableCell>
              <Link
                href={`/contacts/${contact.id}`}
                className="font-medium text-text-primary hover:text-cyan hover:underline"
              >
                {contact.firstName} {contact.lastName}
              </Link>
            </TableCell>
            <TableCell>
              {contact.email ? (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Mail className="h-3.5 w-3.5" />
                  {contact.email}
                </span>
              ) : (
                <span className="text-text-secondary">—</span>
              )}
            </TableCell>
            <TableCell>
              {contact.phone ? (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </span>
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
