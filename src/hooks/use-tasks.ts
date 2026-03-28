import useSWR from "swr";
import type { Task } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTasks(projectId?: string | null, leadId?: string | null) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (leadId) params.set("leadId", leadId);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/tasks?${params.toString()}`,
    fetcher
  );

  return {
    tasks: (data?.data ?? []) as Task[],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export async function createTask(data: Partial<Task>) {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

export async function updateTask(id: string, data: Partial<Task>) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export async function deleteTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
  return res.json();
}
