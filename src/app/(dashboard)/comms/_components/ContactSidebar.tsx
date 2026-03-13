"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { GHLContact } from "@/lib/ghl/types";

interface ContactSidebarProps {
  contact: GHLContact | null;
  loading: boolean;
}

export function ContactSidebar({ contact, loading }: ContactSidebarProps) {
  if (loading || !contact) {
    return (
      <div className="w-72 border-l border-border bg-white p-4">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`.trim();

  return (
    <div className="w-72 overflow-y-auto border-l border-border bg-white p-4">
      {/* Contact header */}
      <div className="mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
          {contact.firstName[0]}
          {contact.lastName[0]}
        </div>
        <h3 className="mt-2 text-sm font-semibold">{fullName}</h3>
      </div>

      {/* Contact info */}
      <div className="space-y-3">
        {contact.phone && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Phone</p>
            <p className="text-sm">{contact.phone}</p>
          </div>
        )}
        {contact.email && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{contact.email}</p>
          </div>
        )}
        {contact.source && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Source</p>
            <p className="text-sm">{contact.source}</p>
          </div>
        )}

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Tags
            </p>
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <Link
          href={`/contacts/${contact.id}`}
          className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View full profile
        </Link>
      </div>
    </div>
  );
}
