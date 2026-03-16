"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useContact, useContactNotes, useAddNote } from "@/hooks/useGHL";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/shared/LoadingSkeleton";
import { ContactInfo } from "./_components/ContactInfo";
import { NotesList } from "./_components/NotesList";
import { AddNoteForm } from "./_components/AddNoteForm";
import { toast } from "sonner";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = use(params);
  const { can } = usePermissions();
  const { data: contactData, isLoading: contactLoading } = useContact(id);
  const { data: notesData, isLoading: notesLoading } = useContactNotes(id);
  const addNote = useAddNote(id);

  const contact = contactData?.contact ?? null;
  const notes = notesData?.notes ?? [];

  function handleAddNote(body: string) {
    addNote.mutate(body, {
      onError: () => {
        toast.error("Error al añadir la nota. Inténtalo de nuevo.");
      },
      onSuccess: () => {
        toast.success("Nota añadida");
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/contacts" />}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      {contactLoading ? (
        <CardSkeleton />
      ) : contact ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <ContactInfo contact={contact} />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Notas</h2>

            {can("contacts:edit") && (
              <AddNoteForm
                onSubmit={handleAddNote}
                sending={addNote.isPending}
              />
            )}

            <NotesList notes={notes} loading={notesLoading} />
          </div>
        </div>
      ) : (
        <p className="text-text-secondary">Contacto no encontrado.</p>
      )}
    </div>
  );
}
