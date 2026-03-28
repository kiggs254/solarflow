import useSWR from "swr";
import type { Proposal } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useProposals(statusId?: string | null) {
  const qs = statusId ? `?statusId=${encodeURIComponent(statusId)}` : "";
  const { data, error, isLoading, mutate } = useSWR(`/api/proposals${qs}`, fetcher);

  return {
    proposals: (data?.data ?? []) as Proposal[],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useProposal(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/proposals/${id}` : null,
    fetcher
  );

  return { proposal: data, isLoading, isError: !!error, mutate };
}

export async function createProposal(data: Partial<Proposal>) {
  const res = await fetch("/api/proposals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create proposal");
  return res.json();
}

export async function updateProposal(id: string, data: Partial<Proposal>) {
  const res = await fetch(`/api/proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json.error === "string"
        ? json.error
        : json.error?.message ?? `Failed to update proposal (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

export async function deleteProposal(id: string) {
  const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete proposal");
  return res.json();
}

export function getProposalPdfUrl(id: string) {
  return `/api/proposals/${id}/pdf`;
}

export type ProposalMailInfo = {
  smtpConfigured: boolean;
  hasRecipient: boolean;
  recipientPreview: string | null;
  hasPublicLink: boolean;
  publicUrl: string | null;
  defaults: {
    subject: string;
    bodyPdf: string;
    bodyPublicLink: string;
  };
};

export async function fetchProposalMailInfo(id: string): Promise<ProposalMailInfo> {
  const res = await fetch(`/api/proposals/${id}/send-email`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to load mail info");
  return json as ProposalMailInfo;
}

export type SendProposalEmailPayload = {
  mode: "pdf" | "public_link";
  subject: string;
  body: string;
};

export async function sendProposalToClient(
  id: string,
  payload: SendProposalEmailPayload
): Promise<{
  proposal: unknown;
  statusUpdated: boolean;
  warning?: string;
}> {
  const res = await fetch(`/api/proposals/${id}/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json.error === "string"
        ? json.error
        : json.error?.message ?? `Send failed (${res.status})`;
    throw new Error(msg);
  }
  return json as { proposal: unknown; statusUpdated: boolean; warning?: string };
}

export async function convertProposalToProject(id: string) {
  const res = await fetch(`/api/proposals/${id}/convert-to-project`, { method: "POST" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json.error === "string"
        ? json.error
        : json.error?.message ?? `Convert failed (${res.status})`;
    throw new Error(msg);
  }
  return json as { project: { id: string } };
}
