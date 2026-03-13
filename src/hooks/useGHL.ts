"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  GHLConversationsResponse,
  GHLMessagesResponse,
  GHLContactsResponse,
  GHLPipelinesResponse,
  GHLOpportunitiesResponse,
  GHLContact,
  GHLNotesResponse,
} from "@/lib/ghl/types";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Conversations ───────────────────────────────────────

export function useConversations() {
  return useQuery<GHLConversationsResponse>({
    queryKey: ["conversations"],
    queryFn: () => fetchJSON("/api/ghl/conversations"),
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery<GHLMessagesResponse>({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      fetchJSON(`/api/ghl/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(
        `/api/ghl/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }
      );
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onMutate: async (message) => {
      await queryClient.cancelQueries({
        queryKey: ["messages", conversationId],
      });
      const previous =
        queryClient.getQueryData<GHLMessagesResponse>([
          "messages",
          conversationId,
        ]);
      // Optimistic update: append message immediately
      if (previous) {
        queryClient.setQueryData<GHLMessagesResponse>(
          ["messages", conversationId],
          {
            ...previous,
            messages: [
              ...previous.messages,
              {
                id: `optimistic-${Date.now()}`,
                conversationId,
                contactId: "",
                body: message,
                direction: "outbound",
                status: "sending",
                dateAdded: new Date().toISOString(),
                messageType: "SMS",
              },
            ],
          }
        );
      }
      return { previous };
    },
    onError: (_err, _msg, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          ["messages", conversationId],
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ─── Contacts ────────────────────────────────────────────

export function useContacts() {
  return useQuery<GHLContactsResponse>({
    queryKey: ["contacts"],
    queryFn: () => fetchJSON("/api/ghl/contacts"),
  });
}

export function useContact(contactId: string | null) {
  return useQuery<{ contact: GHLContact }>({
    queryKey: ["contact", contactId],
    queryFn: () => fetchJSON(`/api/ghl/contacts/${contactId}`),
    enabled: !!contactId,
  });
}

export function useContactNotes(contactId: string | null) {
  return useQuery<GHLNotesResponse>({
    queryKey: ["contact-notes", contactId],
    queryFn: () => fetchJSON(`/api/ghl/contacts/${contactId}/notes`),
    enabled: !!contactId,
  });
}

export function useAddNote(contactId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/ghl/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      return res.json();
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({
        queryKey: ["contact-notes", contactId],
      });
      const previous = queryClient.getQueryData<GHLNotesResponse>([
        "contact-notes",
        contactId,
      ]);
      if (previous) {
        queryClient.setQueryData<GHLNotesResponse>(
          ["contact-notes", contactId],
          {
            notes: [
              {
                id: `optimistic-${Date.now()}`,
                contactId,
                body,
                userId: "",
                dateAdded: new Date().toISOString(),
              },
              ...previous.notes,
            ],
          }
        );
      }
      return { previous };
    },
    onError: (_err, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["contact-notes", contactId],
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["contact-notes", contactId],
      });
    },
  });
}

// ─── Pipelines ───────────────────────────────────────────

export function usePipelines() {
  return useQuery<GHLPipelinesResponse>({
    queryKey: ["pipelines"],
    queryFn: () => fetchJSON("/api/ghl/pipelines"),
  });
}

export function useOpportunities(pipelineId: string | null) {
  return useQuery<GHLOpportunitiesResponse>({
    queryKey: ["opportunities", pipelineId],
    queryFn: () =>
      fetchJSON(`/api/ghl/opportunities?pipelineId=${pipelineId}`),
    enabled: !!pipelineId,
  });
}
