"use client";

import Link from "next/link";
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

const AVATAR_COLORS = [
  "bg-cyan-light text-cyan",
  "bg-purple-light text-purple",
  "bg-success/10 text-success",
  "bg-warning/10 text-warning",
  "bg-danger/10 text-danger",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function RecentConversations({
  conversations,
  loading,
}: RecentConversationsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return <p className="py-6 text-center text-sm text-text-secondary">No recent activity</p>;
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border text-left">
          <th className="pb-2 text-xs font-medium text-text-secondary">Contact</th>
          <th className="pb-2 text-xs font-medium text-text-secondary">Last Message</th>
          <th className="pb-2 text-right text-xs font-medium text-text-secondary">Time</th>
        </tr>
      </thead>
      <tbody>
        {conversations.slice(0, 6).map((convo, i) => (
          <tr key={convo.id} className="border-b border-border/50 last:border-0">
            <td className="py-3">
              <Link href="/comms" className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {getInitials(convo.contactName)}
                </div>
                <span className="text-sm font-medium text-text-primary">{convo.contactName}</span>
              </Link>
            </td>
            <td className="max-w-[200px] py-3">
              <p className="truncate text-sm text-text-secondary">{convo.lastMessageBody}</p>
            </td>
            <td className="py-3 text-right">
              <span className="text-xs text-text-secondary">{timeAgo(convo.lastMessageDate)}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
