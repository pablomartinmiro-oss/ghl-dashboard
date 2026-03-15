"use client";

import { useMemo } from "react";
import { MessageSquare, DollarSign, TrendingUp, Wifi } from "lucide-react";
import { useConversations, useContacts, useOpportunities, usePipelines } from "@/hooks/useGHL";
import { StatCard } from "./_components/StatCard";
import { RecentConversations } from "./_components/RecentConversations";

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

  // Pipeline stage data for snapshot
  const pipeline = pipelineData?.pipelines?.[0];
  const stages = useMemo(() => pipeline?.stages ?? [], [pipeline]);
  const oppsByStage = useMemo(() => {
    const map = new Map<string, number>();
    for (const stage of stages) {
      map.set(stage.id, opportunities.filter((o) => o.pipelineStageId === stage.id).length);
    }
    return map;
  }, [stages, opportunities]);
  const maxStageCount = useMemo(() => Math.max(1, ...Array.from(oppsByStage.values())), [oppsByStage]);

  const stageColors = ["bg-cyan", "bg-purple", "bg-success", "bg-warning", "bg-danger"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">
          Overview of your GHL account activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Deals"
          value={openOpps.length}
          description={`${opportunities.length} total`}
          icon={TrendingUp}
          loading={oppsLoading}
          iconColor="text-cyan"
          iconBg="bg-cyan-light"
        />
        <StatCard
          title="Conversations"
          value={conversations.length}
          description={`${unreadCount} unread`}
          icon={MessageSquare}
          loading={convosLoading}
          iconColor="text-purple"
          iconBg="bg-purple-light"
        />
        <StatCard
          title="Revenue MTD"
          value={formatCurrency(totalPipelineValue)}
          description="Pipeline value"
          icon={DollarSign}
          loading={oppsLoading}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Team Online"
          value={contacts.length}
          description="Contacts synced"
          icon={Wifi}
          loading={contactsLoading}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
      </div>

      {/* Deal Flow + Pipeline Snapshot */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deal Flow Chart placeholder */}
        <div className="rounded-[14px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Deal Flow</h2>
            <span className="text-xs text-text-secondary">Last 7 days</span>
          </div>
          <div className="flex h-48 items-end gap-1">
            {[35, 52, 41, 68, 45, 72, 58].map((val, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-cyan to-cyan/40 transition-all"
                  style={{ height: `${(val / 80) * 100}%` }}
                />
                <span className="text-[10px] text-text-secondary">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Snapshot */}
        <div className="rounded-[14px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Pipeline Snapshot</h2>
            <span className="text-xs text-text-secondary">{opportunities.length} deals</span>
          </div>
          <div className="space-y-3">
            {stages.sort((a, b) => a.position - b.position).map((stage, i) => {
              const count = oppsByStage.get(stage.id) ?? 0;
              const pct = (count / maxStageCount) * 100;
              return (
                <div key={stage.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-text-primary">{stage.name}</span>
                    <span className="text-xs font-medium text-text-secondary">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${stageColors[i % stageColors.length]} transition-all`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stages.length === 0 && !oppsLoading && (
              <p className="py-8 text-center text-sm text-text-secondary">No pipeline data</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-[14px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Recent Activity</h2>
        </div>
        <RecentConversations
          conversations={conversations}
          loading={convosLoading}
        />
      </div>
    </div>
  );
}
