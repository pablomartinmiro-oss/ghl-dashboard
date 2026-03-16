import type { PermissionKey } from "@/types/auth";

export const PERMISSIONS: Record<PermissionKey, string> = {
  "comms:view": "View conversations",
  "comms:send": "Send SMS messages",
  "comms:assign": "Assign/reassign conversations",
  "pipelines:view": "View pipelines and deals",
  "pipelines:edit": "Move deals, edit deal details",
  "pipelines:create": "Create new opportunities",
  "pipelines:delete": "Delete opportunities",
  "analytics:view": "View marketing analytics",
  "analytics:export": "Export analytics data",
  "contacts:view": "View contacts",
  "contacts:edit": "Edit contacts, add notes",
  "contacts:create": "Create new contacts",
  "contacts:delete": "Delete contacts",
  "reservations:view": "View reservations",
  "reservations:create": "Create and confirm reservations",
  "reservations:edit": "Edit and cancel reservations",
  "settings:team": "Manage team members and roles",
  "settings:tenant": "Manage integrations and tenant config",
} as const;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];

export const DEFAULT_ROLES: Record<string, PermissionKey[]> = {
  "Owner / Manager": ALL_PERMISSIONS,
  "Sales Rep": [
    "comms:view",
    "comms:send",
    "pipelines:view",
    "pipelines:edit",
    "pipelines:create",
    "contacts:view",
    "reservations:view",
    "reservations:create",
  ],
  Marketing: ["analytics:view", "analytics:export", "contacts:view"],
  "VA / Admin": [
    "contacts:view",
    "contacts:edit",
    "contacts:create",
    "comms:view",
    "comms:send",
    "reservations:view",
    "reservations:create",
    "reservations:edit",
  ],
};

export function hasPermission(
  userPermissions: PermissionKey[],
  required: PermissionKey
): boolean {
  return userPermissions.includes(required);
}

export function hasAnyPermission(
  userPermissions: PermissionKey[],
  required: PermissionKey[]
): boolean {
  return required.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(
  userPermissions: PermissionKey[],
  required: PermissionKey[]
): boolean {
  return required.every((p) => userPermissions.includes(p));
}
