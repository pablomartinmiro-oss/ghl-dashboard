"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import { useConversations, useMessages, useSendMessage } from "@/hooks/useGHL";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConversationList } from "./_components/ConversationList";
import { MessageThread } from "./_components/MessageThread";
import { MessageInput } from "./_components/MessageInput";
import { ContactSidebar } from "./_components/ContactSidebar";
import { AssignDropdown } from "./_components/AssignDropdown";
import { toast } from "sonner";
import type { GHLContact } from "@/lib/ghl/types";

export default function CommsPage() {
  const { data: session } = useSession();
  const { can } = usePermissions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: convoData, isLoading: convosLoading } = useConversations();
  const { data: msgData, isLoading: msgsLoading } = useMessages(selectedId);
  const sendMessage = useSendMessage(selectedId ?? "");

  const conversations = useMemo(() => convoData?.conversations ?? [], [convoData]);
  const messages = msgData?.messages ?? [];

  // Find selected conversation to get contactId
  const selectedConvo = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId]
  );

  // Build a minimal contact object from conversation data for the sidebar
  // In production, this would fetch the full contact from the API
  const sidebarContact: GHLContact | null = selectedConvo
    ? {
        id: selectedConvo.contactId,
        firstName: selectedConvo.contactName.split(" ")[0] ?? "",
        lastName: selectedConvo.contactName.split(" ").slice(1).join(" ") ?? "",
        email: null,
        phone: null,
        tags: [],
        source: null,
        dateAdded: "",
      }
    : null;

  function handleSend(message: string) {
    sendMessage.mutate(message, {
      onError: () => {
        toast.error("Failed to send message. Please try again.");
      },
    });
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
            <h2 className="text-sm font-semibold text-text-primary">
              {selectedConvo?.contactName ?? "Conversation"}
            </h2>
            {can("comms:assign") && (
              <AssignDropdown
                currentAssignee={selectedConvo?.assignedTo ?? null}
                onAssign={() => {
                  toast.info("Assignment updated");
                }}
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
            title="Select a conversation"
            description="Choose a conversation from the list to view messages"
          />
        </div>
      )}

      {/* Right panel: Contact sidebar */}
      {selectedId && (
        <div className="hidden lg:block">
          <ContactSidebar
            contact={sidebarContact}
            loading={msgsLoading}
          />
        </div>
      )}
    </div>
  );
}
