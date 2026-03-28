import useSWR from "swr";
import type { Lead } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useLeads(stageId?: string) {
  const params = new URLSearchParams();
  if (stageId) params.set("stageId", stageId);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/leads?${params.toString()}`,
    fetcher
  );

  return {
    leads: (data?.data ?? []) as Lead[],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useLead(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/leads/${id}` : null,
    fetcher
  );

  return { lead: data, isLoading, isError: !!error, mutate };
}

export async function createLead(data: Partial<Lead>) {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create lead");
  return res.json();
}

export async function updateLead(id: string, data: Partial<Lead>) {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update lead");
  return res.json();
}

export async function deleteLead(id: string) {
  const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete lead");
  return res.json();
}

export async function createLeadNote(leadId: string, content: string) {
  const res = await fetch(`/api/leads/${leadId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to add note");
  }
  return res.json();
}
