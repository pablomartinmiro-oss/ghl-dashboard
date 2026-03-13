"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GHLConversation } from "@/lib/ghl/types";

interface RecentConversationsProps {
  conversations: GHLConversation[];
  loading: boolean;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RecentConversations({
  conversations,
  loading,
}: RecentConversationsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Conversations</CardTitle>
        <Link
          href="/comms"
          className="text-xs text-muted-foreground hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet</p>
        ) : (
          conversations.slice(0, 5).map((convo) => (
            <Link
              key={convo.id}
              href="/comms"
              className="flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {convo.contactName}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(convo.lastMessageDate)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {convo.lastMessageBody}
                </p>
              </div>
              {convo.unreadCount > 0 && (
                <Badge variant="default" className="text-[10px]">
                  {convo.unreadCount}
                </Badge>
              )}
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
