"use client";

import { useState, useMemo } from "react";
import { useLeads, createLead } from "@/hooks/use-leads";
import { useLeadStages } from "@/hooks/use-workflows";
import { LeadTable } from "@/components/leads/lead-table";
import { PipelineBoard } from "@/components/leads/pipeline-board";
import { LeadForm } from "@/components/leads/lead-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Plus, LayoutGrid, List, Users } from "lucide-react";

export default function LeadsPage() {
  const { stages, isLoading: stagesLoading } = useLeadStages();
  const { leads, isLoading, mutate } = useLeads();
  const [filterStageId, setFilterStageId] = useState("");
  const [view, setView] = useState<"table" | "board">("board");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const filterOptions = useMemo(() => {
    const active = [...stages]
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    return [{ label: "All stages", value: "" }, ...active.map((s) => ({ label: s.label, value: s.id }))];
  }, [stages]);

  const filteredLeads = useMemo(() => {
    if (!filterStageId) return leads;
    return leads.filter((l) => l.stageId === filterStageId);
  }, [leads, filterStageId]);

  const handleCreate = async (data: any) => {
    setCreating(true);
    try {
      await createLead(data);
      await mutate();
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  if (isLoading || stagesLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-foreground">Leads</h1>
          <p className="truncate text-sm text-muted-foreground">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
            {filterStageId ? " (filtered)" : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto sm:gap-2">
          <div className="w-36 shrink-0 [&>div]:space-y-0 sm:w-40">
            <Select
              id="filterLeadStage"
              aria-label="Filter by pipeline stage"
              title="Filter by pipeline stage"
              options={filterOptions}
              value={filterStageId}
              onChange={(e) => setFilterStageId(e.target.value)}
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
            <Plus className="mr-1.5 h-4 w-4" /> Add Lead
          </Button>
        </div>
      </div>

      {leads.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No leads yet"
            description="Create your first lead to get started."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Lead
              </Button>
            }
          />
        </Card>
      ) : filteredLeads.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No leads match this filter"
            description="Clear the stage filter or pick a different stage."
            action={
              <Button variant="outline" onClick={() => setFilterStageId("")}>
                Clear filter
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="lg:hidden">
            <Card>
              <LeadTable leads={filteredLeads} />
            </Card>
          </div>
          <div className="hidden lg:block">
            {view === "board" ? (
              <PipelineBoard leads={filteredLeads as any} stages={stages} mutate={mutate} />
            ) : (
              <Card>
                <LeadTable leads={filteredLeads} />
              </Card>
            )}
          </div>
        </>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create New Lead">
        <LeadForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={creating} />
      </Dialog>
    </div>
  );
}
