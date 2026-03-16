"use client";

import { useState, useMemo, useCallback } from "react";
import { Kanban } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { usePipelines, useOpportunities, useMoveOpportunity } from "@/hooks/useGHL";
import { KanbanSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { KanbanColumn } from "./_components/KanbanColumn";
import { KanbanCard } from "./_components/KanbanCard";
import { PipelineSelector } from "./_components/PipelineSelector";
import { OpportunityModal } from "./_components/OpportunityModal";
import { toast } from "sonner";
import type { GHLOpportunity } from "@/lib/ghl/types";

export default function PipelinePage() {
  const { data: pipelineData, isLoading: pipelinesLoading } = usePipelines();
  const pipelines = useMemo(() => pipelineData?.pipelines ?? [], [pipelineData]);

  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);
  const [activeOpp, setActiveOpp] = useState<GHLOpportunity | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<GHLOpportunity | null>(null);

  const selectedPipelineId = userSelectedId ?? pipelines[0]?.id ?? null;

  const { data: oppData, isLoading: oppsLoading } =
    useOpportunities(selectedPipelineId);
  const opportunities = useMemo(() => oppData?.opportunities ?? [], [oppData]);
  const moveOpp = useMoveOpportunity();

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedPipelineId),
    [pipelines, selectedPipelineId]
  );
  const stages = useMemo(
    () => selectedPipeline?.stages ?? [],
    [selectedPipeline]
  );

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const opp = opportunities.find((o) => o.id === event.active.id);
    setActiveOpp(opp ?? null);
  }, [opportunities]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveOpp(null);
    const { active, over } = event;
    if (!over) return;

    const oppId = active.id as string;
    const newStageId = over.id as string;
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp || opp.pipelineStageId === newStageId) return;

    moveOpp.mutate(
      { id: oppId, stageId: newStageId },
      {
        onSuccess: () => toast.success("Oportunidad movida"),
        onError: () => toast.error("Error al mover la oportunidad"),
      }
    );
  }, [opportunities, moveOpp]);

  const loading = pipelinesLoading || oppsLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Pipeline</h1>
          <p className="text-sm text-text-secondary">Gestiona tus oportunidades por etapa</p>
        </div>
        {!loading && (
          <span className="text-sm text-text-secondary">
            {opportunities.length} oportunidades &middot;{" "}
            {new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: "EUR",
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
          title="Sin etapas de pipeline"
          description="Las etapas aparecerán aquí una vez sincronizadas desde GHL"
        />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages
              .sort((a, b) => a.position - b.position)
              .map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  opportunities={oppsByStage.get(stage.id) ?? []}
                  onCardClick={setSelectedOpp}
                />
              ))}
          </div>
          <DragOverlay>
            {activeOpp ? <KanbanCard opportunity={activeOpp} isDragOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {selectedOpp && (
        <OpportunityModal
          opportunity={selectedOpp}
          stageName={stages.find((s) => s.id === selectedOpp.pipelineStageId)?.name ?? ""}
          onClose={() => setSelectedOpp(null)}
        />
      )}
    </div>
  );
}
