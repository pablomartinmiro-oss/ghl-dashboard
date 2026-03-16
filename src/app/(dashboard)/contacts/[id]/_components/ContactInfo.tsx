"use client";

import { useState } from "react";
import { Mail, Phone, Globe, Calendar, Pencil, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GHLContact } from "@/lib/ghl/types";

interface ContactInfoProps {
  contact: GHLContact;
  canEdit?: boolean;
  onSave?: (data: Record<string, unknown>) => void;
  saving?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ContactInfo({ contact, canEdit, onSave, saving }: ContactInfoProps) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
  });

  const handleSave = () => {
    onSave?.(fields);
    setEditing(false);
  };

  const handleCancel = () => {
    setFields({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
    });
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {contact.firstName} {contact.lastName}
        </CardTitle>
        {canEdit && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-text-secondary">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
        {editing && (
          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-sage text-white hover:bg-sage/90">
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="gap-1.5 text-text-secondary">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary">Nombre</label>
                <input
                  value={fields.firstName}
                  onChange={(e) => setFields((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary">Apellido</label>
                <input
                  value={fields.lastName}
                  onChange={(e) => setFields((f) => ({ ...f, lastName: e.target.value }))}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Email</label>
              <input
                type="email"
                value={fields.email}
                onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Teléfono</label>
              <input
                type="tel"
                value={fields.phone}
                onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 text-sm">
            {contact.email && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Phone className="h-4 w-4" />
                <a href={`tel:${contact.phone}`} className="hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.source && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Globe className="h-4 w-4" />
                {contact.source}
              </div>
            )}
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="h-4 w-4" />
              Añadido {formatDate(contact.dateAdded)}
            </div>
          </div>
        )}

        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
