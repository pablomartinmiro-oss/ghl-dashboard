"use client";

import { UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AssignDropdownProps {
  currentAssignee: string | null;
  onAssign: (userId: string | null) => void;
  disabled?: boolean;
}

// In production, team members would be fetched from the API.
// For now, use placeholder team members from mock data.
const TEAM_MEMBERS = [
  { id: "mock-user-1", name: "Alex (Sales)" },
  { id: "mock-user-2", name: "Jordan (Support)" },
];

export function AssignDropdown({
  currentAssignee,
  onAssign,
  disabled = false,
}: AssignDropdownProps) {
  const assigneeName = TEAM_MEMBERS.find(
    (m) => m.id === currentAssignee
  )?.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" disabled={disabled} className="h-7 gap-1.5 text-xs" />}
      >
        <UserPlus className="h-3.5 w-3.5" />
        {assigneeName ?? "Unassigned"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAssign(null)}>
          Unassigned
        </DropdownMenuItem>
        {TEAM_MEMBERS.map((member) => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => onAssign(member.id)}
          >
            {member.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
