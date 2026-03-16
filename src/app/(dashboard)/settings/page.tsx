"use client";

import { useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTenantSettings, useTeam, useUpdateUserRole } from "@/hooks/useSettings";
import { usePermissions } from "@/hooks/usePermissions";
import { RoleGate } from "@/components/shared/RoleGate";
import { GHLConnectionCard } from "./_components/GHLConnectionCard";
import { TenantInfoCard } from "./_components/TenantInfoCard";
import { TeamTable } from "./_components/TeamTable";
import { toast } from "sonner";

function SettingsToast() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("ghl_connected") === "true") {
      toast.success("GoHighLevel conectado correctamente");
      // Clean up URL
      window.history.replaceState({}, "", "/settings");
    }
    if (searchParams.get("error") === "oauth_failed") {
      toast.error("Error al conectar GoHighLevel. Inténtalo de nuevo.");
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);
  return null;
}

export default function SettingsPage() {
  const { can } = usePermissions();
  const { data: tenantData, isLoading: tenantLoading } = useTenantSettings();
  const { data: teamData, isLoading: teamLoading } = useTeam();
  const updateRole = useUpdateUserRole();

  const tenant = tenantData?.tenant;
  const users = useMemo(() => teamData?.users ?? [], [teamData]);
  const roles = useMemo(() => teamData?.roles ?? [], [teamData]);

  function handleRoleChange(userId: string, roleId: string) {
    updateRole.mutate(
      { userId, roleId },
      {
        onSuccess: () => toast.success("Rol actualizado"),
        onError: () => toast.error("Error al actualizar el rol"),
      }
    );
  }

  return (
    <div className="space-y-6">
      <Suspense>
        <SettingsToast />
      </Suspense>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Ajustes</h1>
        <p className="text-sm text-text-secondary">
          Gestiona tu cuenta y equipo
        </p>
      </div>

      <RoleGate permission="settings:tenant">
        <div className="grid gap-6 lg:grid-cols-2">
          <TenantInfoCard
            name={tenant?.name ?? ""}
            slug={tenant?.slug ?? ""}
            createdAt={tenant?.createdAt ?? ""}
            loading={tenantLoading}
          />
          <GHLConnectionCard
            ghlLocationId={tenant?.ghlLocationId ?? null}
            ghlConnectedAt={tenant?.ghlConnectedAt ?? null}
            ghlTokenExpiry={tenant?.ghlTokenExpiry ?? null}
            loading={tenantLoading}
          />
        </div>
      </RoleGate>

      <RoleGate permission="settings:team">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Equipo</h2>
            <span className="text-sm text-muted-foreground">
              {users.length} miembros
            </span>
          </div>
          <TeamTable
            users={users}
            roles={roles}
            loading={teamLoading}
            canManage={can("settings:team")}
            onRoleChange={handleRoleChange}
          />
        </div>
      </RoleGate>
    </div>
  );
}
