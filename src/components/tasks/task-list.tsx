"use client";

import { updateTask, deleteTask } from "@/hooks/use-tasks";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Circle, Trash2, Calendar, Bell } from "lucide-react";

function formatReminder(d: string | Date) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface TaskListProps {
  tasks: any[];
  onMutate: () => void;
}

export function TaskList({ tasks, onMutate }: TaskListProps) {
  const handleToggle = async (id: string, completed: boolean) => {
    await updateTask(id, { completed: !completed });
    onMutate();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    onMutate();
  };

  return (
    <div className="divide-y divide-border">
      {tasks.map((task: any) => (
        <div key={task.id} className="group flex items-center gap-2 py-3 pl-1 pr-0 sm:gap-3">
          <button
            type="button"
            onClick={() => handleToggle(task.id, task.completed)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:h-auto sm:w-auto sm:p-0"
            aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          >
            {task.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              {task.dueDate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}
              {task.reminderAt && !task.completed && (
                <span className="flex items-center gap-1 text-xs text-brand-700 dark:text-brand-300">
                  <Bell className="h-3 w-3" />
                  {formatReminder(task.reminderAt)}
                </span>
              )}
              {task.project && (
                <span className="text-xs text-muted-foreground">{task.project.name}</span>
              )}
              {task.lead && (
                <span className="text-xs text-muted-foreground">Lead: {task.lead.name}</span>
              )}
              {task.assignedTo && (
                <span className="text-xs text-muted-foreground">{task.assignedTo.name}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(task.id)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 sm:h-9 sm:w-9 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
