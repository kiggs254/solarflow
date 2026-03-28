"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import type { KeyedMutator } from "swr";
import type { LeadPipelineStage } from "@prisma/client";
import { stageColor, formatDate, cn } from "@/lib/utils";
import { updateLead } from "@/hooks/use-leads";

/** Lead as returned by GET /api/leads (includes assignee + pipelineStage) */
export type LeadBoardRow = {
  id: string;
  name: string;
  email?: string | null;
  createdAt: Date | string;
  stageId: string;
  pipelineStage?: LeadPipelineStage | null;
  assignedTo?: { id: string; name: string; email: string; role: string } | null;
};

const DND_TYPE = "application/solarflow-lead";

type LeadsResponse = { data: LeadBoardRow[]; total?: number; page?: number; pageSize?: number };

interface PipelineBoardProps {
  leads: LeadBoardRow[];
  stages: LeadPipelineStage[];
  mutate: KeyedMutator<LeadsResponse>;
}

export function PipelineBoard({ leads, stages, mutate }: PipelineBoardProps) {
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const activeStages = useMemo(
    () => [...stages].filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [stages]
  );

  const grouped = useMemo(() => {
    const map: Record<string, LeadBoardRow[]> = {};
    for (const s of activeStages) map[s.id] = [];
    for (const l of leads) {
      if (map[l.stageId]) map[l.stageId].push(l);
    }
    return map;
  }, [leads, activeStages]);

  const handleDragStart = useCallback((e: React.DragEvent, lead: LeadBoardRow) => {
    e.dataTransfer.setData(DND_TYPE, JSON.stringify({ id: lead.id, fromStageId: lead.stageId }));
    e.dataTransfer.effectAllowed = "move";
    setMovingId(lead.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setMovingId(null);
    setDragOverStageId(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStageId: string) => {
      e.preventDefault();
      setDragOverStageId(null);
      const raw = e.dataTransfer.getData(DND_TYPE);
      if (!raw) return;
      let payload: { id: string; fromStageId: string };
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (payload.fromStageId === targetStageId) {
        setMovingId(null);
        return;
      }

      setMovingId(payload.id);

      await mutate(
        async (current) => {
          if (!current?.data) return current;
          return {
            ...current,
            data: current.data.map((l) =>
              l.id === payload.id
                ? {
                    ...l,
                    stageId: targetStageId,
                    pipelineStage: activeStages.find((s) => s.id === targetStageId) ?? l.pipelineStage,
                  }
                : l
            ),
          };
        },
        { revalidate: false }
      );

      try {
        await updateLead(payload.id, { stageId: targetStageId });
      } catch {
        await mutate();
        setMovingId(null);
        return;
      } finally {
        setMovingId(null);
      }
      await mutate();
    },
    [mutate, activeStages]
  );

  if (activeStages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active pipeline stages configured. An admin can add them under Settings → Workflows.
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {activeStages.map((stage) => {
        const label = stage.label;
        const colorKey = stage.key;
        return (
          <div key={stage.id} className="min-w-[260px] flex-shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${stageColor(colorKey)}`}
              >
                {label}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{grouped[stage.id]?.length ?? 0}</span>
            </div>
            <div
              role="region"
              aria-label={`${label} column`}
              className={cn(
                "min-h-[160px] space-y-2 rounded-xl border-2 border-dashed p-2 transition-colors",
                dragOverStageId === stage.id
                  ? "border-brand-400 bg-brand-50/80"
                  : "border-transparent bg-muted/50"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverStageId(stage.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStageId(null);
                }
              }}
              onDrop={(e) => void handleDrop(e, stage.id)}
            >
              {(grouped[stage.id] ?? []).map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "group flex cursor-grab items-stretch gap-1 rounded-lg border border-border bg-card shadow-sm transition-shadow active:cursor-grabbing",
                    movingId === lead.id && "opacity-60 ring-2 ring-brand-400",
                    "hover:shadow-md"
                  )}
                >
                  <div
                    className="flex shrink-0 items-center border-r border-border px-1 text-muted-foreground hover:text-muted-foreground"
                    title="Drag to another stage"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 py-3 pr-3">
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    {lead.email && <p className="mt-0.5 text-xs text-muted-foreground">{lead.email}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {lead.assignedTo?.name ?? "Unassigned"}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
                    </div>
                    <Link
                      href={`/leads/${lead.id}`}
                      draggable={false}
                      onClick={(ev) => ev.stopPropagation()}
                      className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      View lead →
                    </Link>
                  </div>
                </div>
              ))}
              {(grouped[stage.id] ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
                  Drop leads here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
