"use client";

import { useMemo, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTenantSettings, useTeam, useUpdateUserRole, useInviteTeamMember, useResendInvite } from "@/hooks/useSettings";
import { usePermissions } from "@/hooks/usePermissions";
import { RoleGate } from "@/components/shared/RoleGate";
import { GHLConnectionCard } from "./_components/GHLConnectionCard";
import { TenantInfoCard } from "./_components/TenantInfoCard";
import { SyncStatusCard } from "./_components/DataModeCard";
import { TeamTable } from "./_components/TeamTable";
import { TeamInviteCard } from "./_components/TeamInviteCard";
import { GrouponMappingCard } from "./_components/GrouponMappingCard";
import { SeasonCalendarCard } from "./_components/SeasonCalendarCard";
import { PriceImportCard } from "./_components/PriceImportCard";
import { SeedCatalogCard } from "./_components/SeedCatalogCard";
import { SurveyUrlCard } from "./_components/SurveyUrlCard";
import { DestinationsCard } from "./_components/DestinationsCard";
import { SuppliersCard } from "./_components/SuppliersCard";
import { CategoriesCard } from "./_components/CategoriesCard";
import { BrandingCard } from "./_components/BrandingCard";
import { Building2, RefreshCw, Package, Plug, Users, Palette, Globe2 } from "lucide-react";
import { toast } from "sonner";

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-light">
        <Icon className="h-4 w-4 text-coral" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-border" />;
}

function SettingsToast() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("ghl_connected") === "true") {
      toast.success("GoHighLevel conectado correctamente");
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
  const inviteMember = useInviteTeamMember();
  const resendInvite = useResendInvite();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

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

  function handleResendInvite(userId: string) {
    setResendingId(userId);
    resendInvite.mutate(userId, {
      onSuccess: () => toast.success("Invitación reenviada"),
      onError: (err) => toast.error(err.message),
      onSettled: () => setResendingId(null),
    });
  }

  function handleInvite(email: string) {
    inviteMember.mutate(email, {
      onSuccess: (data) => {
        setInviteUrl(data.inviteUrl);
        toast.success("Invitación enviada por email");
      },
      onError: (err) => toast.error(err.message),
    });
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

      {/* Cuenta */}
      <RoleGate permission="settings:tenant">
        <section>
          <SectionHeader icon={Building2} title="Cuenta" />
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
        </section>
      </RoleGate>

      <SectionDivider />

      {/* Sincronizacion */}
      <RoleGate permission="settings:tenant">
        <section>
          <SectionHeader icon={RefreshCw} title="Sincronización" />
          <SyncStatusCard
            ghlConnected={!!tenant?.ghlLocationId}
            loading={tenantLoading}
            syncStatus={tenantData?.syncStatus}
            syncState={tenant?.syncState}
            syncProgressMsg={tenant?.syncProgressMsg}
            lastSyncError={tenant?.lastSyncError}
          />
        </section>
      </RoleGate>

      <SectionDivider />

      {/* Catalogo */}
      <RoleGate permission="settings:tenant">
        <section>
          <SectionHeader icon={Package} title="Catálogo" />
          <div className="space-y-6">
            <SeasonCalendarCard />
            <PriceImportCard />
            <SeedCatalogCard />
          </div>
        </section>
      </RoleGate>

      <SectionDivider />

      {/* Integraciones */}
      <RoleGate permission="settings:tenant">
        <section>
          <SectionHeader icon={Plug} title="Integraciones" />
          <div className="space-y-6">
            <SurveyUrlCard slug={tenant?.slug ?? ""} loading={tenantLoading} />
            <GrouponMappingCard />
          </div>
        </section>
      </RoleGate>

      <SectionDivider />

      {/* Equipo */}
      <RoleGate permission="settings:team">
        <section>
          <div className="flex items-center justify-between">
            <SectionHeader icon={Users} title="Equipo" />
            <span className="text-sm text-text-secondary">
              {users.length} miembros
            </span>
          </div>

          <div className="space-y-4">
            <TeamInviteCard
              onInvite={handleInvite}
              isPending={inviteMember.isPending}
              inviteUrl={inviteUrl}
            />

            <TeamTable
              users={users}
              roles={roles}
              loading={teamLoading}
              canManage={can("settings:team")}
              onRoleChange={handleRoleChange}
              onResendInvite={handleResendInvite}
              resendingId={resendingId}
            />
          </div>
        </section>
      </RoleGate>
    </div>
  );
}
