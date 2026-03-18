"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import { MailIcon } from "lucide-react";

interface TeamUser {
  id: string;
  email: string;
  name: string | null;
  roleId: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; name: string };
}

interface TeamRole {
  id: string;
  name: string;
}

interface TeamTableProps {
  users: TeamUser[];
  roles: TeamRole[];
  loading: boolean;
  canManage: boolean;
  onRoleChange: (userId: string, roleId: string) => void;
  onResendInvite?: (userId: string) => void;
  resendingId?: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Nunca";
  return new Date(dateStr).toLocaleDateString("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TeamTable({
  users,
  roles,
  loading,
  canManage,
  onRoleChange,
  onResendInvite,
  resendingId,
}: TeamTableProps) {
  if (loading) return <TableSkeleton rows={4} />;

  return (
    <div className="overflow-hidden rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Último acceso</TableHead>
            {canManage && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.name ?? "—"}
              </TableCell>
              <TableCell className="text-text-secondary">
                {user.email}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <select
                    value={user.roleId}
                    onChange={(e) => onRoleChange(user.id, e.target.value)}
                    className="rounded border border-border bg-white px-2 py-1 text-xs"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant="secondary">{user.role.name}</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "default" : "outline"}>
                  {user.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="text-text-secondary">
                {formatDate(user.lastLoginAt)}
              </TableCell>
              {canManage && (
                <TableCell>
                  {!user.isActive && onResendInvite && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resendingId === user.id}
                      onClick={() => onResendInvite(user.id)}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      <MailIcon className="h-3 w-3" />
                      {resendingId === user.id ? "Enviando..." : "Reenviar"}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
