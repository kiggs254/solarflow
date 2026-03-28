"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useLead, updateLead, deleteLead, createLeadNote } from "@/hooks/use-leads";
import { useLeadStages } from "@/hooks/use-workflows";
import { useTasks, createTask } from "@/hooks/use-tasks";
import { LeadForm } from "@/components/leads/lead-form";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageLoading } from "@/components/ui/loading";
import { stageColor, formatDate, formatCurrency, cn } from "@/lib/utils";
import { ArrowLeft, Edit, Trash2, MapPin, Mail, Phone, Sun, Plus } from "lucide-react";
import Link from "next/link";
import type { FormFieldDef } from "@/lib/lead-forms";

const assignFetcher = (url: string) => fetch(url).then((r) => r.json());

type TabId = "overview" | "notes" | "tasks";

function humanizeFieldKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCustomValue(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return String(value);
  return String(value);
}

function buildSolarAnalysisHref(lead: {
  id: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const q = new URLSearchParams();
  if (lead.latitude != null && lead.longitude != null) {
    q.set("lat", String(lead.latitude));
    q.set("lng", String(lead.longitude));
  }
  if (lead.address?.trim()) q.set("address", lead.address.trim());
  q.set("leadId", lead.id);
  return `/solar?${q.toString()}`;
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { stages } = useLeadStages();
  const { lead, isLoading, mutate } = useLead(id);
  const { data: assignData } = useSWR<{ data: { id: string; name: string }[] }>(
    "/api/users/for-assignment",
    assignFetcher
  );
  const assignableUsers = assignData?.data ?? [];
  const { tasks: leadTasks, isLoading: tasksLoading, mutate: mutTasks } = useTasks(null, id);

  const [tab, setTab] = useState<TabId>("overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stageBusy, setStageBusy] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [taskCreating, setTaskCreating] = useState(false);
  const router = useRouter();

  const activeStages = useMemo(
    () =>
      [...stages]
        .filter((s) => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [stages]
  );

  const stageOptions = activeStages.map((s) => ({ label: s.label, value: s.id }));
  const assigneeOptions = [{ label: "Unassigned", value: "" }, ...assignableUsers.map((u) => ({ label: u.name, value: u.id }))];

  const customFieldRows = useMemo(() => {
    if (!lead) return [];
    const raw = lead.customFields;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const obj = raw as Record<string, unknown>;
    const defs = Array.isArray(lead.sourceForm?.fields)
      ? (lead.sourceForm!.fields as FormFieldDef[])
      : [];
    const labelByKey = Object.fromEntries(defs.map((d) => [d.key, d.label]));
    return Object.entries(obj)
      .filter(([k]) => !k.endsWith("_latitude") && !k.endsWith("_longitude"))
      .map(([key, value]) => {
        const lat = obj[`${key}_latitude`];
        const lng = obj[`${key}_longitude`];
        const extra =
          typeof lat === "number" && typeof lng === "number"
            ? ` (${lat.toFixed(5)}, ${lng.toFixed(5)})`
            : "";
        return {
          key,
          label: labelByKey[key] ?? humanizeFieldKey(key),
          text: formatCustomValue(value) + extra,
        };
      });
  }, [lead]);

  if (isLoading || !lead) return <PageLoading />;

  const canOpenSolar =
    (lead.address != null && lead.address.trim() !== "") ||
    (lead.latitude != null && lead.longitude != null);

  const leadNotes = Array.isArray((lead as any).leadNotes) ? (lead as any).leadNotes : [];

  const handleUpdate = async (data: any) => {
    setSaving(true);
    try {
      await updateLead(id, data);
      await mutate();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (stageId: string) => {
    if (!stageId || stageId === lead.stageId) return;
    setStageBusy(true);
    try {
      await updateLead(id, { stageId });
      await mutate();
    } finally {
      setStageBusy(false);
    }
  };

  const handleAssignChange = async (assignedToId: string) => {
    const normalized = assignedToId === "" ? null : assignedToId;
    if (normalized === lead.assignedToId) return;
    setAssignBusy(true);
    try {
      await updateLead(id, { assignedToId: normalized });
      await mutate();
    } finally {
      setAssignBusy(false);
    }
  };

  const handleAddNote = async () => {
    const t = noteDraft.trim();
    if (!t) return;
    setNoteBusy(true);
    try {
      await createLeadNote(id, t);
      setNoteDraft("");
      await mutate();
    } finally {
      setNoteBusy(false);
    }
  };

  const handleCreateTask = async (data: any) => {
    setTaskCreating(true);
    try {
      await createTask({ ...data, leadId: id });
      await mutTasks();
      setTaskDialog(false);
    } finally {
      setTaskCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    await deleteLead(id);
    router.push("/leads");
  };

  const pendingTasks = leadTasks.filter((t: { completed: boolean }) => !t.completed);
  const doneTasks = leadTasks.filter((t: { completed: boolean }) => t.completed);

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "notes", label: "Notes" },
    { id: "tasks", label: "Tasks" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/leads"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground">{lead.name}</h1>
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor(lead.pipelineStage?.key ?? "")}`}
          >
            {lead.pipelineStage?.label ?? "—"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canOpenSolar ? (
            <Link
              href={buildSolarAnalysisHref(lead)}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-md bg-brand-500 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              )}
            >
              <Sun className="mr-1.5 h-3.5 w-3.5" />
              Solar analysis
            </Link>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled
              title="Add a street address or latitude/longitude on this lead to open solar analysis"
            >
              <Sun className="mr-1.5 h-3.5 w-3.5" />
              Solar analysis
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => void handleDelete()}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <Select
            id="lead-stage-inline"
            label="Pipeline stage"
            options={stageOptions}
            value={lead.stageId}
            disabled={stageBusy || stageOptions.length === 0}
            onChange={(e) => void handleStageChange(e.target.value)}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <Select
            id="lead-assign-inline"
            label="Assigned to"
            options={assigneeOptions}
            value={lead.assignedToId ?? ""}
            disabled={assignBusy}
            onChange={(e) => void handleAssignChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-brand-500/15 text-brand-900 dark:text-brand-100"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{lead.phone}</span>
                  </div>
                )}
                {lead.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{lead.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {lead.notes?.trim() && (
              <Card>
                <CardHeader>
                  <CardTitle>Legacy note</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">From the old single-note field</p>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{lead.notes}</p>
                </CardContent>
              </Card>
            )}

            {customFieldRows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom fields</CardTitle>
                  {lead.sourceForm && (
                    <p className="text-xs font-normal text-muted-foreground">From form: {lead.sourceForm.name}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {customFieldRows.map((row) => (
                    <div key={row.key} className="text-sm">
                      <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
                      <p className="whitespace-pre-wrap text-foreground">{row.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {lead.proposals && lead.proposals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Proposals</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {lead.proposals.map((p: any) => (
                      <Link
                        key={p.id}
                        href={`/proposals/${p.id}`}
                        className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.systemSizeKw} kW &middot; {p.panelCount} panels
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(p.installCost)}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned to</span>
                  <span className="font-medium text-foreground">{lead.assignedTo?.name ?? "Unassigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{formatDate(lead.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="text-foreground">{formatDate(lead.updatedAt)}</span>
                </div>
                {lead.project && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project</span>
                    <Link
                      href={`/projects/${lead.project.id}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {lead.project.name}
                    </Link>
                  </div>
                )}
                {lead.sourceForm && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Lead form</span>
                    <a
                      href={`/f/${lead.sourceForm.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {lead.sourceForm.name} (public)
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "notes" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add a note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                id="new-note"
                label="Note"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="What happened on the call? Next steps?"
                rows={4}
              />
              <Button type="button" disabled={noteBusy || !noteDraft.trim()} onClick={() => void handleAddNote()}>
                {noteBusy ? "Saving…" : "Add note"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {leadNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet. Add one above.</p>
              ) : (
                leadNotes.map((n: { id: string; content: string; createdAt: string; createdBy: { name: string } }) => (
                  <div key={n.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="mb-1 flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">{n.createdBy?.name ?? "User"}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{n.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" onClick={() => setTaskDialog(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add task
            </Button>
          </div>
          {tasksLoading ? (
            <PageLoading />
          ) : (
            <div className="space-y-6">
              {pendingTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending ({pendingTasks.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskList tasks={pendingTasks} onMutate={() => void mutTasks()} />
                  </CardContent>
                </Card>
              )}
              {doneTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Completed ({doneTasks.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskList tasks={doneTasks} onMutate={() => void mutTasks()} />
                  </CardContent>
                </Card>
              )}
              {leadTasks.length === 0 && (
                <Card className="p-8 text-center text-sm text-muted-foreground">No tasks for this lead yet.</Card>
              )}
            </div>
          )}

          <Dialog open={taskDialog} onClose={() => setTaskDialog(false)} title="New task">
            <TaskForm
              defaultLeadId={id}
              onSubmit={handleCreateTask}
              onCancel={() => setTaskDialog(false)}
              loading={taskCreating}
            />
          </Dialog>
        </div>
      )}

      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit lead">
        <LeadForm initialData={lead} onSubmit={handleUpdate} onCancel={() => setEditing(false)} loading={saving} />
      </Dialog>
    </div>
  );
}
