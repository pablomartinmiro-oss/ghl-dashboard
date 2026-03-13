"use client";

import { useMemo } from "react";
import { MessageSquare, Users, DollarSign, TrendingUp } from "lucide-react";
import { useConversations, useContacts, useOpportunities, usePipelines } from "@/hooks/useGHL";
import { StatCard } from "./_components/StatCard";
import { RecentConversations } from "./_components/RecentConversations";
import { TopOpportunities } from "./_components/TopOpportunities";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function DashboardHome() {
  const { data: convoData, isLoading: convosLoading } = useConversations();
  const { data: contactData, isLoading: contactsLoading } = useContacts();
  const { data: pipelineData } = usePipelines();

  const firstPipelineId = pipelineData?.pipelines?.[0]?.id ?? null;
  const { data: oppData, isLoading: oppsLoading } = useOpportunities(firstPipelineId);

  const conversations = useMemo(() => convoData?.conversations ?? [], [convoData]);
  const contacts = useMemo(() => contactData?.contacts ?? [], [contactData]);
  const opportunities = useMemo(() => oppData?.opportunities ?? [], [oppData]);

  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const openOpps = opportunities.filter((o) => o.status === "open");
  const totalPipelineValue = openOpps.reduce((sum, o) => sum + o.monetaryValue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your GHL account activity
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Unread Messages"
          value={unreadCount}
          description={`${conversations.length} total conversations`}
          icon={MessageSquare}
          loading={convosLoading}
        />
        <StatCard
          title="Total Contacts"
          value={contacts.length}
          description="Synced from GHL"
          icon={Users}
          loading={contactsLoading}
        />
        <StatCard
          title="Open Deals"
          value={openOpps.length}
          description={`${opportunities.length} total opportunities`}
          icon={TrendingUp}
          loading={oppsLoading}
        />
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(totalPipelineValue)}
          description="Open opportunities"
          icon={DollarSign}
          loading={oppsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentConversations
          conversations={conversations}
          loading={convosLoading}
        />
        <TopOpportunities
          opportunities={opportunities}
          loading={oppsLoading}
        />
      </div>
    </div>
  );
}
