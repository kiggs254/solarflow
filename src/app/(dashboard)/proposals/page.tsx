"use client";

import { useState, useMemo } from "react";
import { useProposals, createProposal } from "@/hooks/use-proposals";
import { useLeads } from "@/hooks/use-leads";
import { useProposalStatuses } from "@/hooks/use-workflows";
import { ProposalStatusBoard } from "@/components/proposals/proposal-status-board";
import { ProposalTable } from "@/components/proposals/proposal-table";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Plus, FileText, LayoutGrid, List } from "lucide-react";

export default function ProposalsPage() {
  const { statuses, isLoading: stLoading } = useProposalStatuses();
  const [filterStatusId, setFilterStatusId] = useState("");
  const [view, setView] = useState<"board" | "table">("board");
  const { proposals, isLoading, mutate } = useProposals();
  const { leads } = useLeads();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const filterOptions = useMemo(() => {
    const active = [...statuses]
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    return [{ label: "All statuses", value: "" }, ...active.map((s) => ({ label: s.label, value: s.id }))];
  }, [statuses]);

  const filteredProposals = useMemo(() => {
    if (!filterStatusId) return proposals;
    return proposals.filter((p: any) => p.statusId === filterStatusId);
  }, [proposals, filterStatusId]);

  const handleCreate = async (data: any) => {
    setCreating(true);
    try {
      await createProposal(data);
      await mutate();
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  if (isLoading || stLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-foreground">Proposals</h1>
          <p className="truncate text-sm text-muted-foreground">
            {filteredProposals.length} proposal{filteredProposals.length !== 1 ? "s" : ""}
            {filterStatusId ? " (filtered)" : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto sm:gap-2">
          <div className="w-36 shrink-0 [&>div]:space-y-0 sm:w-40">
            <Select
              id="filterStatus"
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
            <Plus className="mr-1.5 h-4 w-4" /> New Proposal
          </Button>
        </div>
      </div>

      {proposals.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No proposals yet"
            description="Create a proposal to generate solar installation quotes."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New Proposal
              </Button>
            }
          />
        </Card>
      ) : filteredProposals.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No proposals match this filter"
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
                <ProposalTable proposals={filteredProposals} />
              </div>
            </Card>
          </div>
          <div className="hidden lg:block">
            {view === "board" ? (
              <ProposalStatusBoard proposals={filteredProposals as any} statuses={statuses} mutate={mutate} />
            ) : (
              <Card className="overflow-x-auto p-0">
                <div className="p-4">
                  <ProposalTable proposals={filteredProposals} />
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create Proposal">
        <ProposalForm
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
