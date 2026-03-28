import useSWR from "swr";
import type { LeadPipelineStage, ProjectStatusOption, ProposalStatusOption } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useLeadStages() {
  const { data, error, isLoading, mutate } = useSWR<{ data: LeadPipelineStage[] }>(
    "/api/settings/lead-stages",
    fetcher
  );
  return {
    stages: data?.data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useProjectStatuses() {
  const { data, error, isLoading, mutate } = useSWR<{ data: ProjectStatusOption[] }>(
    "/api/settings/project-statuses",
    fetcher
  );
  return {
    statuses: data?.data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useProposalStatuses() {
  const { data, error, isLoading, mutate } = useSWR<{ data: ProposalStatusOption[] }>(
    "/api/settings/proposal-statuses",
    fetcher
  );
  return {
    statuses: data?.data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export async function reorderLeadStages(orderedIds: string[]) {
  const res = await fetch("/api/settings/lead-stages/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Reorder failed");
  return res.json() as Promise<{ data: LeadPipelineStage[] }>;
}

export async function reorderProjectStatuses(orderedIds: string[]) {
  const res = await fetch("/api/settings/project-statuses/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Reorder failed");
  return res.json() as Promise<{ data: ProjectStatusOption[] }>;
}

export async function reorderProposalStatuses(orderedIds: string[]) {
  const res = await fetch("/api/settings/proposal-statuses/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Reorder failed");
  return res.json() as Promise<{ data: ProposalStatusOption[] }>;
}

export async function createLeadStage(body: Record<string, unknown>) {
  const res = await fetch("/api/settings/lead-stages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Create failed");
  return res.json() as Promise<LeadPipelineStage>;
}

export async function patchLeadStage(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/settings/lead-stages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
  return res.json() as Promise<LeadPipelineStage>;
}

export async function deleteLeadStage(id: string) {
  const res = await fetch(`/api/settings/lead-stages/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
  return res.json();
}

export async function createProjectStatus(body: Record<string, unknown>) {
  const res = await fetch("/api/settings/project-statuses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Create failed");
  return res.json() as Promise<ProjectStatusOption>;
}

export async function patchProjectStatus(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/settings/project-statuses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
  return res.json() as Promise<ProjectStatusOption>;
}

export async function deleteProjectStatus(id: string) {
  const res = await fetch(`/api/settings/project-statuses/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
  return res.json();
}

export async function createProposalStatus(body: Record<string, unknown>) {
  const res = await fetch("/api/settings/proposal-statuses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Create failed");
  return res.json() as Promise<ProposalStatusOption>;
}

export async function patchProposalStatus(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/settings/proposal-statuses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
  return res.json() as Promise<ProposalStatusOption>;
}

export async function deleteProposalStatus(id: string) {
  const res = await fetch(`/api/settings/proposal-statuses/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
  return res.json();
}
