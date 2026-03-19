"use client";

import { cn } from "@/lib/utils";
import { CHANNEL_CONFIG } from "./ChannelBadge";

export type FilterTab = "all" | "mine" | "unassigned" | "unread";
export type ChannelFilter = "all" | string;

interface ConversationFiltersProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  activeChannel: ChannelFilter;
  onChannelChange: (channel: ChannelFilter) => void;
  counts?: { all: number; unread: number; mine: number; unassigned: number };
}

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "No leídas" },
  { value: "mine", label: "Mías" },
  { value: "unassigned", label: "Sin asignar" },
];

const CHANNELS: { value: ChannelFilter; label: string; icon: string }[] = [
  { value: "all", label: "Todos", icon: "📨" },
  ...Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
    icon: cfg.icon,
  })),
];

export function ConversationFilters({
  activeTab,
  onTabChange,
  activeChannel,
  onChannelChange,
  counts,
}: ConversationFiltersProps) {
  return (
    <div className="space-y-1 border-b border-border px-3 pb-2">
      {/* Status filters */}
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const count = counts?.[tab.value];
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-coral-light text-coral"
                  : "text-text-secondary hover:bg-warm-muted hover:text-text-primary"
              )}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  activeTab === tab.value ? "bg-coral text-white" : "bg-muted text-text-secondary"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Channel filters */}
      <div className="flex gap-1 overflow-x-auto">
        {CHANNELS.map((ch) => (
          <button
            key={ch.value}
            onClick={() => onChannelChange(ch.value)}
            className={cn(
              "flex items-center gap-1 whitespace-nowrap rounded-[6px] px-2 py-1 text-[11px] font-medium transition-colors",
              activeChannel === ch.value
                ? "bg-coral-light text-coral"
                : "text-text-secondary hover:bg-warm-muted hover:text-text-primary"
            )}
          >
            <span>{ch.icon}</span>
            {ch.label}
          </button>
        ))}
      </div>
    </div>
  );
}
