"use client";

import { useState, useCallback, useMemo } from "react";
import type { KeyedMutator } from "swr";
import type { ProposalStatusOption, Proposal } from "@prisma/client";
import { ProposalCard } from "./proposal-card";
import { proposalStatusColor, cn } from "@/lib/utils";
import { updateProposal } from "@/hooks/use-proposals";

const DND_TYPE = "application/solarflow-proposal";

type ProposalsResponse = { data: Proposal[] };

interface ProposalStatusBoardProps {
  proposals: Proposal[];
  statuses: ProposalStatusOption[];
  mutate: KeyedMutator<ProposalsResponse>;
}

export function ProposalStatusBoard({ proposals, statuses, mutate }: ProposalStatusBoardProps) {
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const activeStatuses = useMemo(
    () =>
      [...statuses]
        .filter((s) => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [statuses]
  );

  const grouped = useMemo(() => {
    const map: Record<string, typeof proposals> = {};
    for (const s of activeStatuses) map[s.id] = [];
    for (const p of proposals) {
      if (map[p.statusId]) map[p.statusId].push(p as any);
    }
    return map;
  }, [proposals, activeStatuses]);

  const handleDragStart = useCallback((e: React.DragEvent, proposal: Proposal) => {
    e.dataTransfer.setData(
      DND_TYPE,
      JSON.stringify({ id: proposal.id, fromStatusId: proposal.statusId })
    );
    e.dataTransfer.effectAllowed = "move";
    setMovingId(proposal.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setMovingId(null);
    setDragOverStatusId(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStatusId: string) => {
      e.preventDefault();
      setDragOverStatusId(null);
      const raw = e.dataTransfer.getData(DND_TYPE);
      if (!raw) return;
      let payload: { id: string; fromStatusId: string };
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (payload.fromStatusId === targetStatusId) {
        setMovingId(null);
        return;
      }

      setMovingId(payload.id);

      await mutate(
        async (current) => {
          if (!current?.data) return current;
          return {
            ...current,
            data: current.data.map((p) =>
              p.id === payload.id
                ? {
                    ...p,
                    statusId: targetStatusId,
                    proposalStatus:
                      activeStatuses.find((s) => s.id === targetStatusId) ?? (p as any).proposalStatus,
                  }
                : p
            ),
          };
        },
        { revalidate: false }
      );

      try {
        await updateProposal(payload.id, { statusId: targetStatusId });
      } catch {
        await mutate();
        setMovingId(null);
        return;
      } finally {
        setMovingId(null);
      }
      await mutate();
    },
    [mutate, activeStatuses]
  );

  if (activeStatuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active proposal statuses configured. An admin can add them under Settings → Workflows.
      </p>
    );
  }

  const colClass =
    activeStatuses.length <= 4
      ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
      : "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

  return (
    <div className={colClass}>
      {activeStatuses.map((status) => {
        const label = status.label;
        const colorKey = status.key;
        return (
          <div key={status.id}>
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${proposalStatusColor(colorKey)}`}
              >
                {label}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {grouped[status.id]?.length ?? 0}
              </span>
            </div>
            <div
              role="region"
              aria-label={`${label} column`}
              className={cn(
                "min-h-[200px] space-y-3 rounded-xl border-2 border-dashed p-2 transition-colors",
                dragOverStatusId === status.id
                  ? "border-violet-400 bg-violet-50/80 dark:bg-violet-950/30"
                  : "border-transparent bg-muted/50"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverStatusId(status.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStatusId(null);
                }
              }}
              onDrop={(e) => void handleDrop(e, status.id)}
            >
              {(grouped[status.id] ?? []).map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  showStatusBadge={false}
                  draggable
                  isDragging={movingId === proposal.id}
                  onDragStart={(e) => handleDragStart(e, proposal)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {(grouped[status.id] ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
                  Drop proposals here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
