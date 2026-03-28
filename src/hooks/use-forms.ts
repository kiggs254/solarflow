import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
});

export type LeadCaptureFormRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: unknown;
  isActive: boolean;
  defaultStageId: string | null;
  assignToUserId: string | null;
  successMessage: string | null;
  brandColor: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { leads: number };
};

export function useForms(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<{ data: LeadCaptureFormRow[] }>(
    enabled ? "/api/forms" : null,
    fetcher
  );
  return {
    forms: data?.data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export async function createForm(body: Record<string, unknown>) {
  const res = await fetch("/api/forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Create failed");
  return data as LeadCaptureFormRow;
}

export async function updateForm(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/forms/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Update failed");
  return data as LeadCaptureFormRow;
}

export async function deleteForm(id: string) {
  const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Delete failed");
  return data;
}
