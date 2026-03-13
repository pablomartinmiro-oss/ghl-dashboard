"use client";

import { cn } from "@/lib/utils";

export type FilterTab = "all" | "mine" | "unassigned" | "unread";

interface ConversationFiltersProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
}

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
  { value: "unread", label: "Unread" },
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
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === tab.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
