import useSWR from "swr";
import type { DashboardStats } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDashboard() {
  const { data, error, isLoading } = useSWR<DashboardStats>(
    "/api/dashboard/stats",
    fetcher,
    { refreshInterval: 30000 }
  );

  return { stats: data, isLoading, isError: !!error };
}
