"use client";

import { use, useState } from "react";
import { useProject, updateProject } from "@/hooks/use-projects";
import { useProjectStatuses } from "@/hooks/use-workflows";
import { useTasks, createTask, updateTask } from "@/hooks/use-tasks";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/loading";
import { statusColor, formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { ArrowLeft, Edit, Plus, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { statuses } = useProjectStatuses();
  const { project, isLoading, mutate } = useProject(id);
  const { tasks, mutate: mutateTasks } = useTasks(id);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState("");

  if (isLoading || !project) return <PageLoading />;

  const handleUpdate = async (data: any) => {
    setSaving(true);
    try {
      await updateProject(id, data);
      await mutate();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    await createTask({ title: newTask, projectId: id });
    setNewTask("");
    await mutateTasks();
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    await updateTask(taskId, { completed: !completed });
    await mutateTasks();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${statusColor(project.projectStatus?.key ?? "")}`}
          >
            {project.projectStatus?.label ?? "—"}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              <span className="text-sm text-muted-foreground">
                {tasks.filter((t: any) => t.completed).length}/{tasks.length} completed
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Add a task..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                />
                <Button onClick={handleAddTask} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tasks.map((task: any) => (
                <button
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, task.completed)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted transition-colors"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className={`text-sm ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {task.title}
                  </span>
                </button>
              ))}
              {tasks.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No tasks yet</p>
              )}
            </CardContent>
          </Card>

          {project.proposals && project.proposals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Proposals</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {project.proposals.map((p: any) => (
                    <Link key={p.id} href={`/proposals/${p.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-muted transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.systemSizeKw} kW &middot; {p.panelCount} panels</p>
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
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead</span>
                <Link href={`/leads/${project.leadId}`} className="text-brand-600 hover:text-brand-700 font-medium">
                  {project.lead?.name}
                </Link>
              </div>
              {project.systemSizeKw && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">System Size</span>
                  <span className="text-foreground font-medium">{formatNumber(project.systemSizeKw)} kW</span>
                </div>
              )}
              {project.panelCount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Panels</span>
                  <span className="text-foreground font-medium">{project.panelCount}</span>
                </div>
              )}
              {project.estimatedCost && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Cost</span>
                  <span className="text-foreground font-medium">{formatCurrency(project.estimatedCost)}</span>
                </div>
              )}
              {project.annualOutput && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual Output</span>
                  <span className="text-foreground font-medium">{formatNumber(project.annualOutput)} kWh</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">{formatDate(project.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit Project">
        <ProjectForm
          statuses={statuses}
          initialData={project}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          loading={saving}
        />
      </Dialog>
    </div>
  );
}
