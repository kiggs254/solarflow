"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import {
  useLeadStages,
  useProjectStatuses,
  useProposalStatuses,
  reorderLeadStages,
  reorderProjectStatuses,
  reorderProposalStatuses,
  createLeadStage,
  patchLeadStage,
  deleteLeadStage,
  createProjectStatus,
  patchProjectStatus,
  deleteProjectStatus,
  createProposalStatus,
  patchProposalStatus,
  deleteProposalStatus,
} from "@/hooks/use-workflows";
import { useUsers, createUser, patchUser, deleteUser, type PublicUser } from "@/hooks/use-users";
import { LeadFormsAdmin } from "@/components/settings/lead-forms-admin";
import { WhiteLabelAdmin } from "@/components/settings/white-label-admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, User, GitBranch, Paintbrush } from "lucide-react";
import type { LeadPipelineStage, ProjectStatusOption, ProposalStatusOption } from "@prisma/client";

type PageTab = "general" | "workflows" | "branding";
type WorkflowSub = "lead-stages" | "project-statuses" | "proposal-statuses" | "lead-forms" | "users";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const [pageTab, setPageTab] = useState<PageTab>("general");
  const [workflowSub, setWorkflowSub] = useState<WorkflowSub>("lead-stages");

  const { stages: leadStages, mutate: mutLeads } = useLeadStages();
  const { statuses: projectStatuses, mutate: mutProj } = useProjectStatuses();
  const { statuses: proposalStatuses, mutate: mutProp } = useProposalStatuses();
  const { users, mutate: mutUsers } = useUsers(!!isAdmin);

  const tabs: { id: PageTab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: "general", label: "General", icon: User },
    { id: "workflows", label: "Workflows", icon: GitBranch, adminOnly: true },
    { id: "branding", label: "Branding", icon: Paintbrush, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Top-level tabs */}
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-border pb-px sm:mx-0">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPageTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors min-h-11 ${
                pageTab === t.id
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* General tab */}
      {pageTab === "general" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input id="name" label="Name" defaultValue={session?.user?.name ?? ""} disabled />
              <Input id="email" label="Email" defaultValue={session?.user?.email ?? ""} disabled />
              <Input id="role" label="Role" defaultValue={(session?.user as any)?.role ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Contact your administrator to update profile settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">Choose light, dark, or match your system.</p>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input id="gmaps" label="Google Maps API Key" type="password" defaultValue="••••••••••••" disabled />
              <Input id="gsolar" label="Google Solar API Key" type="password" defaultValue="••••••••••••" disabled />
              <p className="text-xs text-muted-foreground">
                API keys are configured via environment variables on the server.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workflows tab (admin) */}
      {pageTab === "workflows" && isAdmin && (
        <div className="space-y-4">
          <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:mx-0">
            {(
              [
                ["lead-stages", "Lead pipeline"],
                ["project-statuses", "Project statuses"],
                ["proposal-statuses", "Proposal statuses"],
                ["lead-forms", "Lead forms"],
                ["users", "Users"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setWorkflowSub(id)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-10 sm:py-1.5 ${
                  workflowSub === id
                    ? "bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-100"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {workflowSub === "lead-stages" && (
            <LeadStagesAdmin rows={leadStages} onRefresh={mutLeads} />
          )}
          {workflowSub === "project-statuses" && (
            <ProjectStatusesAdmin rows={projectStatuses} onRefresh={mutProj} />
          )}
          {workflowSub === "proposal-statuses" && (
            <ProposalStatusesAdmin rows={proposalStatuses} onRefresh={mutProp} />
          )}
          {workflowSub === "lead-forms" && (
            <LeadFormsAdmin stages={leadStages} users={users ?? []} />
          )}
          {workflowSub === "users" && (
            <UsersAdmin
              users={users}
              currentUserId={session?.user?.id}
              onRefresh={mutUsers}
            />
          )}
        </div>
      )}

      {/* Branding tab (admin) */}
      {pageTab === "branding" && isAdmin && <WhiteLabelAdmin />}
    </div>
  );
}

function LeadStagesAdmin({
  rows,
  onRefresh,
}: {
  rows: LeadPipelineStage[];
  onRefresh: () => void;
}) {
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editRow, setEditRow] = useState<LeadPipelineStage | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    key: "",
    label: "",
    outcome: "NONE" as "NONE" | "WON" | "LOST",
    isActive: true,
  });

  const openAdd = () => {
    setForm({ key: "", label: "", outcome: "NONE", isActive: true });
    setEditRow(null);
    setDialog("add");
  };

  const openEdit = (r: LeadPipelineStage) => {
    setEditRow(r);
    setForm({
      key: r.key,
      label: r.label,
      outcome: r.outcome as "NONE" | "WON" | "LOST",
      isActive: r.isActive,
    });
    setDialog("edit");
  };

  const save = async () => {
    setSaving(true);
    try {
      if (dialog === "add") {
        await createLeadStage({
          key: form.key.trim(),
          label: form.label.trim(),
          outcome: form.outcome,
          isActive: form.isActive,
        });
      } else if (dialog === "edit" && editRow) {
        await patchLeadStage(editRow.id, {
          label: form.label.trim(),
          outcome: form.outcome,
          isActive: form.isActive,
        });
      }
      setDialog(null);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    const ids = sorted.map((r) => r.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    await reorderLeadStages(ids);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add stage
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Key</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, i) => (
            <TableRow key={r.id}>
              <TableCell className="flex gap-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, -1)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, 1)}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell className="font-mono text-xs">{r.key}</TableCell>
              <TableCell>{r.label}</TableCell>
              <TableCell>{r.outcome}</TableCell>
              <TableCell>{r.isActive ? "Yes" : "No"}</TableCell>
              <TableCell className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!confirm(`Delete stage “${r.label}”?`)) return;
                    try {
                      await deleteLeadStage(r.id);
                      onRefresh();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Delete failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === "add" ? "Add pipeline stage" : "Edit pipeline stage"}
      >
        <div className="space-y-3">
          {dialog === "add" && (
            <Input
              label="Key (UPPER_SNAKE_CASE)"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="CUSTOM_STAGE"
            />
          )}
          <Input
            label="Label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <Select
            id="outcome"
            label="Outcome (dashboard won/lost)"
            options={[
              { label: "None", value: "NONE" },
              { label: "Won", value: "WON" },
              { label: "Lost", value: "LOST" },
            ]}
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value as typeof form.outcome })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !form.label.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function ProjectStatusesAdmin({
  rows,
  onRefresh,
}: {
  rows: ProjectStatusOption[];
  onRefresh: () => void;
}) {
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editRow, setEditRow] = useState<ProjectStatusOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    key: "",
    label: "",
    isActive: true,
    isActiveInstallation: false,
  });

  const openAdd = () => {
    setForm({ key: "", label: "", isActive: true, isActiveInstallation: false });
    setEditRow(null);
    setDialog("add");
  };

  const openEdit = (r: ProjectStatusOption) => {
    setEditRow(r);
    setForm({
      key: r.key,
      label: r.label,
      isActive: r.isActive,
      isActiveInstallation: r.isActiveInstallation,
    });
    setDialog("edit");
  };

  const save = async () => {
    setSaving(true);
    try {
      if (dialog === "add") {
        await createProjectStatus({
          key: form.key.trim(),
          label: form.label.trim(),
          isActive: form.isActive,
          isActiveInstallation: form.isActiveInstallation,
        });
      } else if (dialog === "edit" && editRow) {
        await patchProjectStatus(editRow.id, {
          label: form.label.trim(),
          isActive: form.isActive,
          isActiveInstallation: form.isActiveInstallation,
        });
      }
      setDialog(null);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    const ids = sorted.map((r) => r.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    await reorderProjectStatuses(ids);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add status
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Key</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Installation</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, i) => (
            <TableRow key={r.id}>
              <TableCell className="flex gap-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, -1)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, 1)}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell className="font-mono text-xs">{r.key}</TableCell>
              <TableCell>{r.label}</TableCell>
              <TableCell>{r.isActiveInstallation ? "Yes" : "No"}</TableCell>
              <TableCell>{r.isActive ? "Yes" : "No"}</TableCell>
              <TableCell className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!confirm(`Delete status “${r.label}”?`)) return;
                    try {
                      await deleteProjectStatus(r.id);
                      onRefresh();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Delete failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === "add" ? "Add project status" : "Edit project status"}
      >
        <div className="space-y-3">
          {dialog === "add" && (
            <Input
              label="Key (UPPER_SNAKE_CASE)"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
            />
          )}
          <Input
            label="Label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActiveInstallation}
              onChange={(e) => setForm({ ...form, isActiveInstallation: e.target.checked })}
            />
            Counts as active installation (dashboard)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !form.label.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function ProposalStatusesAdmin({
  rows,
  onRefresh,
}: {
  rows: ProposalStatusOption[];
  onRefresh: () => void;
}) {
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editRow, setEditRow] = useState<ProposalStatusOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    key: "",
    label: "",
    isActive: true,
    blocksConversion: false,
  });

  const openAdd = () => {
    setForm({ key: "", label: "", isActive: true, blocksConversion: false });
    setEditRow(null);
    setDialog("add");
  };

  const openEdit = (r: ProposalStatusOption) => {
    setEditRow(r);
    setForm({
      key: r.key,
      label: r.label,
      isActive: r.isActive,
      blocksConversion: r.blocksConversion,
    });
    setDialog("edit");
  };

  const save = async () => {
    setSaving(true);
    try {
      if (dialog === "add") {
        await createProposalStatus({
          key: form.key.trim(),
          label: form.label.trim(),
          isActive: form.isActive,
          blocksConversion: form.blocksConversion,
        });
      } else if (dialog === "edit" && editRow) {
        await patchProposalStatus(editRow.id, {
          label: form.label.trim(),
          isActive: form.isActive,
          blocksConversion: form.blocksConversion,
        });
      }
      setDialog(null);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    const ids = sorted.map((r) => r.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    await reorderProposalStatuses(ids);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add status
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Key</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Blocks convert</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, i) => (
            <TableRow key={r.id}>
              <TableCell className="flex gap-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, -1)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, 1)}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell className="font-mono text-xs">{r.key}</TableCell>
              <TableCell>{r.label}</TableCell>
              <TableCell>{r.blocksConversion ? "Yes" : "No"}</TableCell>
              <TableCell>{r.isActive ? "Yes" : "No"}</TableCell>
              <TableCell className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!confirm(`Delete status “${r.label}”?`)) return;
                    try {
                      await deleteProposalStatus(r.id);
                      onRefresh();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Delete failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === "add" ? "Add proposal status" : "Edit proposal status"}
      >
        <div className="space-y-3">
          {dialog === "add" && (
            <Input
              label="Key (UPPER_SNAKE_CASE)"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
            />
          )}
          <Input
            label="Label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.blocksConversion}
              onChange={(e) => setForm({ ...form, blocksConversion: e.target.checked })}
            />
            Block “convert to project”
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !form.label.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function UsersAdmin({
  users,
  currentUserId,
  onRefresh,
}: {
  users: PublicUser[];
  currentUserId?: string;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<PublicUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "SALES_REP" as "ADMIN" | "SALES_REP",
    notifyProposalAccepted: false,
  });

  const openAdd = () => {
    setForm({ email: "", password: "", name: "", role: "SALES_REP", notifyProposalAccepted: false });
    setEditUser(null);
    setShowAdd(true);
  };

  const openEdit = (u: PublicUser) => {
    setEditUser(u);
    setForm({
      email: u.email,
      password: "",
      name: u.name,
      role: u.role as "ADMIN" | "SALES_REP",
      notifyProposalAccepted: u.notifyProposalAccepted ?? false,
    });
    setShowAdd(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editUser) {
        await patchUser(editUser.id, {
          email: form.email.trim(),
          name: form.name.trim(),
          role: form.role,
          notifyProposalAccepted: form.notifyProposalAccepted,
        });
      } else {
        await createUser({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          role: form.role,
        });
      }
      setShowAdd(false);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add user
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[140px] text-center">Notify on proposal accepted</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell className="text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  title="Email this user when a client accepts a proposal via the public link"
                  checked={u.notifyProposalAccepted ?? false}
                  onChange={async (e) => {
                    try {
                      await patchUser(u.id, { notifyProposalAccepted: e.target.checked });
                      onRefresh();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Update failed");
                    }
                  }}
                />
              </TableCell>
              <TableCell className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(u)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={u.id === currentUserId}
                  title={u.id === currentUserId ? "Cannot delete yourself" : "Delete user"}
                  onClick={async () => {
                    if (!confirm(`Delete user ${u.email}?`)) return;
                    try {
                      await deleteUser(u.id);
                      onRefresh();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Delete failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={editUser ? "Edit user" : "Add user"}
      >
        <div className="space-y-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {!editUser && (
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
          <Select
            id="role"
            label="Role"
            options={[
              { label: "Sales rep", value: "SALES_REP" },
              { label: "Admin", value: "ADMIN" },
            ]}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
          />
          {editUser && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={form.notifyProposalAccepted}
                onChange={(e) => setForm({ ...form, notifyProposalAccepted: e.target.checked })}
              />
              Notify when a client accepts a proposal (public link)
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void save()}
              disabled={
                saving ||
                !form.name.trim() ||
                !form.email.trim() ||
                (!editUser && form.password.length < 6)
              }
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
