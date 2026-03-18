"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  ghlLocationId: string | null;
  ghlConnectedAt: string | null;
  ghlTokenExpiry: string | null;
  onboardingComplete: boolean;
  onboardingDismissed: boolean;
  isDemo: boolean;
  isActive: boolean;
  createdAt: string;
  syncState: string | null;
  syncProgressMsg: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

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
  isSystem: boolean;
  permissions: string[];
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

interface SyncStatus {
  lastFullSync: string | null;
  lastIncrSync: string | null;
  contactCount: number;
  conversationCount: number;
  opportunityCount: number;
  pipelineCount: number;
  syncInProgress: boolean;
}

export function useTenantSettings() {
  return useQuery<{ tenant: TenantSettings; syncStatus: SyncStatus | null }>({
    queryKey: ["tenant-settings"],
    queryFn: () => fetchJSON("/api/settings/tenant"),
  });
}

export function useTeam() {
  return useQuery<{ users: TeamUser[]; roles: TeamRole[] }>({
    queryKey: ["team"],
    queryFn: () => fetchJSON("/api/settings/team"),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const res = await fetch(`/api/settings/team/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useInviteTeamMember() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/settings/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send invite");
      }
      return res.json() as Promise<{ inviteUrl: string }>;
    },
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/settings/team/${userId}/resend-invite`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to resend invite");
      }
      return res.json() as Promise<{ success: boolean }>;
    },
  });
}
