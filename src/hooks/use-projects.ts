import useSWR from "swr";
import type { Project } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useProjects(statusId?: string) {
  const params = new URLSearchParams();
  if (statusId) params.set("statusId", statusId);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/projects?${params.toString()}`,
    fetcher
  );

  return {
    projects: (data?.data ?? []) as Project[],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useProject(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/projects/${id}` : null,
    fetcher
  );

  return { project: data, isLoading, isError: !!error, mutate };
}

export async function createProject(data: Partial<Project>) {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function updateProject(id: string, data: Partial<Project>) {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update project");
  return res.json();
}

export async function deleteProject(id: string) {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete project");
  return res.json();
}
