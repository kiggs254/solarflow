"use client";

import { useState } from "react";
import { useTasks, createTask } from "@/hooks/use-tasks";
import { TaskList } from "@/components/tasks/task-list";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, CheckSquare } from "lucide-react";

export default function TasksPage() {
  const { tasks, isLoading, mutate } = useTasks();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (data: any) => {
    setCreating(true);
    try {
      await createTask(data);
      await mutate();
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) return <PageLoading />;

  const pending = tasks.filter((t: any) => !t.completed);
  const completed = tasks.filter((t: any) => t.completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">{pending.length} pending &middot; {completed.length} completed</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<CheckSquare className="h-12 w-12" />}
            title="No tasks yet"
            description="Create tasks to track your project work."
            action={<Button onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Task</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending ({pending.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList tasks={pending} onMutate={() => mutate()} />
              </CardContent>
            </Card>
          )}
          {completed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Completed ({completed.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList tasks={completed} onMutate={() => mutate()} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create Task">
        <TaskForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={creating} />
      </Dialog>
    </div>
  );
}
