"use client";

import { useState, useMemo } from "react";
import { Kanban } from "lucide-react";
import { usePipelines, useOpportunities } from "@/hooks/useGHL";
import { KanbanSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { KanbanColumn } from "./_components/KanbanColumn";
import { PipelineSelector } from "./_components/PipelineSelector";

export default function PipelinePage() {
  const { data: pipelineData, isLoading: pipelinesLoading } = usePipelines();
  const pipelines = useMemo(() => pipelineData?.pipelines ?? [], [pipelineData]);

  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);

  // Derive effective pipeline ID: user selection or first pipeline
  const selectedPipelineId = userSelectedId ?? pipelines[0]?.id ?? null;

  const { data: oppData, isLoading: oppsLoading } =
    useOpportunities(selectedPipelineId);
  const opportunities = useMemo(() => oppData?.opportunities ?? [], [oppData]);

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedPipelineId),
    [pipelines, selectedPipelineId]
  );
  const stages = useMemo(
    () => selectedPipeline?.stages ?? [],
    [selectedPipeline]
  );

  // Group opportunities by stage
  const oppsByStage = useMemo(() => {
    const map = new Map<string, typeof opportunities>();
    for (const stage of stages) {
      map.set(
        stage.id,
        opportunities.filter((o) => o.pipelineStageId === stage.id)
      );
    }
    return map;
  }, [stages, opportunities]);

  const totalValue = opportunities.reduce(
    (sum, o) => sum + o.monetaryValue,
    0
  );

  const loading = pipelinesLoading || oppsLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Pipeline</h1>
          <p className="text-sm text-text-secondary">Manage your deals across stages</p>
        </div>
        {!loading && (
          <span className="text-sm text-text-secondary">
            {opportunities.length} deals &middot;{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
            }).format(totalValue)}
          </span>
        )}
      </div>

      <PipelineSelector
        pipelines={pipelines}
        selectedId={selectedPipelineId}
        onSelect={setUserSelectedId}
      />

      {loading ? (
        <KanbanSkeleton />
      ) : stages.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="No pipeline stages"
          description="Pipeline stages will appear here once synced from GHL"
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages
            .sort((a, b) => a.position - b.position)
            .map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opportunities={oppsByStage.get(stage.id) ?? []}
              />
            ))}
        </div>
      )}
    </div>
  );
}
