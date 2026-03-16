"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import { useConversations, useMessages, useSendMessage, useAssignConversation, useContact } from "@/hooks/useGHL";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConversationList } from "./_components/ConversationList";
import { MessageThread } from "./_components/MessageThread";
import { MessageInput } from "./_components/MessageInput";
import { ContactSidebar } from "./_components/ContactSidebar";
import { AssignDropdown } from "./_components/AssignDropdown";
import { ChannelBadge } from "./_components/ChannelBadge";
import { toast } from "sonner";

export default function CommsPage() {
  const { data: session } = useSession();
  const { can } = usePermissions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: convoData, isLoading: convosLoading } = useConversations();
  const { data: msgData, isLoading: msgsLoading } = useMessages(selectedId);
  const sendMessage = useSendMessage(selectedId ?? "");
  const assignConversation = useAssignConversation();

  const conversations = useMemo(() => convoData?.conversations ?? [], [convoData]);
  const messages = msgData?.messages ?? [];

  const selectedConvo = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId]
  );

  // Fetch full contact data for sidebar
  const contactId = selectedConvo?.contactId ?? null;
  const { data: contactData, isLoading: contactLoading } = useContact(contactId);
  const sidebarContact = contactData?.contact ?? null;

  function handleSend(message: string) {
    sendMessage.mutate(message, {
      onError: () => {
        toast.error("Error al enviar el mensaje. Inténtalo de nuevo.");
      },
    });
  }

  function handleAssign(userId: string | null) {
    if (!selectedId) return;
    assignConversation.mutate(
      { conversationId: selectedId, assignedTo: userId },
      {
        onSuccess: () => toast.success("Asignación actualizada"),
        onError: () => toast.error("Error al asignar la conversación"),
      }
    );
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)]">
      {/* Left panel: Conversation list */}
      <div className="w-80 shrink-0">
        <ConversationList
          conversations={conversations}
          loading={convosLoading}
          selectedId={selectedId}
          currentUserId={session?.user?.id ?? ""}
          onSelect={setSelectedId}
        />
      </div>

      {/* Center panel: Message thread */}
      {selectedId ? (
        <div className="flex flex-1 flex-col">
          {/* Thread header */}
          <div className="flex items-center justify-between border-b border-border bg-white px-4 py-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-text-primary">
                {selectedConvo?.contactName ?? "Conversación"}
              </h2>
              {selectedConvo && (
                <ChannelBadge type={selectedConvo.type} size="md" />
              )}
            </div>
            {can("comms:assign") && (
              <AssignDropdown
                currentAssignee={selectedConvo?.assignedTo ?? null}
                onAssign={handleAssign}
                disabled={assignConversation.isPending}
              />
            )}
          </div>

          <MessageThread messages={messages} loading={msgsLoading} />

          <MessageInput
            onSend={handleSend}
            disabled={!can("comms:send")}
            sending={sendMessage.isPending}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-surface">
          <EmptyState
            icon={MessageSquare}
            title="Selecciona una conversación"
            description="Elige una conversación de la lista para ver los mensajes"
          />
        </div>
      )}

      {/* Right panel: Contact sidebar */}
      {selectedId && (
        <div className="hidden lg:block">
          <ContactSidebar
            contact={sidebarContact}
            loading={contactLoading || msgsLoading}
          />
        </div>
      )}
    </div>
  );
}
