"use client";

import { cn } from "@/lib/utils";

export type FilterTab = "all" | "mine" | "unassigned" | "unread";

interface ConversationFiltersProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
}

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Starred" },
];

export function ConversationFilters({
  activeTab,
  onTabChange,
}: ConversationFiltersProps) {
  return (
    <div className="flex gap-1 border-b border-border px-3 pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === tab.value
              ? "bg-cyan-light text-cyan"
              : "text-text-secondary hover:bg-muted hover:text-text-primary"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
