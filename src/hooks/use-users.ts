import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  notifyProposalAccepted: boolean;
  createdAt: string;
  updatedAt: string;
};

export function useUsers(enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR<{ data: PublicUser[] }>(
    enabled ? "/api/users" : null,
    fetcher
  );
  return {
    users: data?.data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export async function createUser(body: { email: string; password: string; name: string; role: string }) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create user");
  return res.json() as Promise<PublicUser>;
}

export async function patchUser(
  id: string,
  body: Partial<{ email: string; name: string; role: string; notifyProposalAccepted: boolean }>
) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update user");
  return res.json() as Promise<PublicUser>;
}

export async function deleteUser(id: string) {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to delete user");
  return res.json();
}

export type AssignableUser = { id: string; name: string };

export function useAssignableUsers() {
  const { data, error, isLoading } = useSWR<{ data: AssignableUser[] }>(
    "/api/users/for-assignment",
    fetcher
  );
  return {
    users: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}
