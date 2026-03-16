"use client";

import { UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/hooks/useSettings";

interface AssignDropdownProps {
  currentAssignee: string | null;
  onAssign: (userId: string | null) => void;
  disabled?: boolean;
}

export function AssignDropdown({
  currentAssignee,
  onAssign,
  disabled = false,
}: AssignDropdownProps) {
  const { data } = useTeam();
  const members = data?.users ?? [];

  const assigneeName = members.find(
    (m) => m.id === currentAssignee
  )?.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" disabled={disabled} className="h-7 gap-1.5 text-xs" />}
      >
        <UserPlus className="h-3.5 w-3.5" />
        {assigneeName ?? "Sin asignar"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAssign(null)}>
          Sin asignar
        </DropdownMenuItem>
        {members.map((member) => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => onAssign(member.id)}
          >
            {member.name ?? member.email}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
