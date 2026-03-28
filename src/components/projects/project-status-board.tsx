"use client";

import { useState, useCallback, useMemo } from "react";
import type { KeyedMutator } from "swr";
import type { ProjectStatusOption, Project } from "@prisma/client";
import { ProjectCard } from "./project-card";
import { statusColor, cn } from "@/lib/utils";
import { updateProject } from "@/hooks/use-projects";

const DND_TYPE = "application/solarflow-project";

type ProjectsResponse = { data: Project[] };

interface ProjectStatusBoardProps {
  projects: Project[];
  statuses: ProjectStatusOption[];
  mutate: KeyedMutator<ProjectsResponse>;
}

export function ProjectStatusBoard({ projects, statuses, mutate }: ProjectStatusBoardProps) {
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
    const map: Record<string, Project[]> = {};
    for (const s of activeStatuses) map[s.id] = [];
    for (const p of projects) {
      if (map[p.statusId]) map[p.statusId].push(p);
    }
    return map;
  }, [projects, activeStatuses]);

  const handleDragStart = useCallback((e: React.DragEvent, project: Project) => {
    e.dataTransfer.setData(
      DND_TYPE,
      JSON.stringify({ id: project.id, fromStatusId: project.statusId })
    );
    e.dataTransfer.effectAllowed = "move";
    setMovingId(project.id);
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
                    projectStatus: activeStatuses.find((s) => s.id === targetStatusId) ?? (p as any).projectStatus,
                  }
                : p
            ),
          };
        },
        { revalidate: false }
      );

      try {
        await updateProject(payload.id, { statusId: targetStatusId });
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
        No active project statuses configured. An admin can add them under Settings → Workflows.
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
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(colorKey)}`}
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
                  ? "border-sky-400 bg-sky-50/80"
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
              {(grouped[status.id] ?? []).map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  draggable
                  isDragging={movingId === project.id}
                  onDragStart={(e) => handleDragStart(e, project)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {(grouped[status.id] ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
                  Drop projects here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
