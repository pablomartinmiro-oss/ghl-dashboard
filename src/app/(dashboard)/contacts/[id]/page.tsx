"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useContact, useContactNotes, useAddNote, useUpdateContact, useDeleteContact } from "@/hooks/useGHL";
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
  const router = useRouter();
  const { can } = usePermissions();
  const { data: contactData, isLoading: contactLoading } = useContact(id);
  const { data: notesData, isLoading: notesLoading } = useContactNotes(id);
  const addNote = useAddNote(id);
  const updateContact = useUpdateContact(id);
  const deleteContact = useDeleteContact(id);

  const contact = contactData?.contact ?? null;
  const notes = notesData?.notes ?? [];

  function handleAddNote(body: string) {
    addNote.mutate(body, {
      onError: () => toast.error("Error al añadir la nota. Inténtalo de nuevo."),
      onSuccess: () => toast.success("Nota añadida"),
    });
  }

  function handleSaveContact(data: Record<string, unknown>) {
    updateContact.mutate(data, {
      onSuccess: () => toast.success("Contacto actualizado"),
      onError: () => toast.error("Error al actualizar el contacto"),
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este contacto? Esta acción no se puede deshacer.")) return;
    deleteContact.mutate(undefined, {
      onSuccess: () => {
        toast.success("Contacto eliminado");
        router.push("/contacts");
      },
      onError: () => toast.error("Error al eliminar el contacto"),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link href="/contacts" />}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        {can("contacts:delete") && contact && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-muted-red border-muted-red/30 hover:bg-muted-red-light"
            onClick={handleDelete}
            disabled={deleteContact.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </Button>
        )}
      </div>

      {contactLoading ? (
        <CardSkeleton />
      ) : contact ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <ContactInfo
            contact={contact}
            canEdit={can("contacts:edit")}
            onSave={handleSaveContact}
            saving={updateContact.isPending}
          />

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
