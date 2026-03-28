"use client";

import { useState, useMemo } from "react";
import { useProjects, createProject } from "@/hooks/use-projects";
import { useLeads } from "@/hooks/use-leads";
import { useProjectStatuses } from "@/hooks/use-workflows";
import { ProjectStatusBoard } from "@/components/projects/project-status-board";
import { ProjectTable } from "@/components/projects/project-table";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Plus, FolderKanban, LayoutGrid, List } from "lucide-react";

export default function ProjectsPage() {
  const { statuses, isLoading: statusLoading } = useProjectStatuses();
  const { projects, isLoading, mutate } = useProjects();
  const { leads } = useLeads();
  const [filterStatusId, setFilterStatusId] = useState("");
  const [view, setView] = useState<"board" | "table">("board");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const filterOptions = useMemo(() => {
    const active = [...statuses]
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    return [{ label: "All statuses", value: "" }, ...active.map((s) => ({ label: s.label, value: s.id }))];
  }, [statuses]);

  const filteredProjects = useMemo(() => {
    if (!filterStatusId) return projects;
    return projects.filter((p) => p.statusId === filterStatusId);
  }, [projects, filterStatusId]);

  const handleCreate = async (data: any) => {
    setCreating(true);
    try {
      await createProject(data);
      await mutate();
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  if (isLoading || statusLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-foreground">Projects</h1>
          <p className="truncate text-sm text-muted-foreground">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
            {filterStatusId ? " (filtered)" : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto sm:gap-2">
          <div className="w-36 shrink-0 [&>div]:space-y-0 sm:w-40">
            <Select
              id="filterProjectStatus"
              aria-label="Filter by status"
              title="Filter by status"
              options={filterOptions}
              value={filterStatusId}
              onChange={(e) => setFilterStatusId(e.target.value)}
            />
          </div>
          <div className="hidden h-9 shrink-0 rounded-lg border border-border bg-card lg:flex">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`inline-flex h-full items-center justify-center px-2 ${view === "board" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"} rounded-l-lg transition-colors`}
              aria-label="Board view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`inline-flex h-full items-center justify-center px-2 ${view === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"} rounded-r-lg transition-colors`}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            type="button"
            className="shrink-0 whitespace-nowrap"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<FolderKanban className="h-12 w-12" />}
            title="No projects yet"
            description="Create a project to start tracking solar installations."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New Project
              </Button>
            }
          />
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<FolderKanban className="h-12 w-12" />}
            title="No projects match this filter"
            description="Clear the status filter or pick a different status."
            action={
              <Button variant="outline" onClick={() => setFilterStatusId("")}>
                Clear filter
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="lg:hidden">
            <Card className="overflow-x-auto p-0">
              <div className="p-4">
                <ProjectTable projects={filteredProjects} />
              </div>
            </Card>
          </div>
          <div className="hidden lg:block">
            {view === "board" ? (
              <ProjectStatusBoard projects={filteredProjects} statuses={statuses} mutate={mutate} />
            ) : (
              <Card className="overflow-x-auto p-0">
                <div className="p-4">
                  <ProjectTable projects={filteredProjects} />
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create New Project">
        <ProjectForm
          statuses={statuses}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          loading={creating}
          leads={leads.map((l: any) => ({ id: l.id, name: l.name }))}
        />
      </Dialog>
    </div>
  );
}
