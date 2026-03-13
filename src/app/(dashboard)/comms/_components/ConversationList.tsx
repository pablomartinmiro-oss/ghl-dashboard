"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConversationListSkeleton } from "@/components/shared/LoadingSkeleton";
import { ConversationFilters, type FilterTab } from "./ConversationFilters";
import type { GHLConversation } from "@/lib/ghl/types";

interface ConversationListProps {
  conversations: GHLConversation[];
  loading: boolean;
  selectedId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  loading,
  selectedId,
  currentUserId,
  onSelect,
}: ConversationListProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = conversations;

    // Apply tab filter
    switch (filter) {
      case "mine":
        list = list.filter((c) => c.assignedTo === currentUserId);
        break;
      case "unassigned":
        list = list.filter((c) => !c.assignedTo);
        break;
      case "unread":
        list = list.filter((c) => c.unreadCount > 0);
        break;
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.contactName.toLowerCase().includes(q));
    }

    // Sort by most recent
    return [...list].sort(
      (a, b) =>
        new Date(b.lastMessageDate).getTime() -
        new Date(a.lastMessageDate).getTime()
    );
  }, [conversations, filter, search, currentUserId]);

  return (
    <div className="flex h-full flex-col border-r border-border bg-white">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <ConversationFilters activeTab={filter} onTabChange={setFilter} />

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ConversationListSkeleton />
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No conversations found
          </p>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors hover:bg-accent/50",
                selectedId === conv.id && "bg-accent"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {conv.contactName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium">
                    {conv.contactName}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(conv.lastMessageDate)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {conv.lastMessageBody}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="h-5 min-w-5 justify-center px-1 text-xs"
                >
                  {conv.unreadCount}
                </Badge>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
