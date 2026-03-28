import useSWR from "swr";
import type { BuildingInsights } from "@/types/solar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useBuildingInsights(lat: number | null, lng: number | null) {
  const shouldFetch = lat !== null && lng !== null && lat !== 0 && lng !== 0;

  const { data, error, isLoading, mutate } = useSWR<BuildingInsights>(
    shouldFetch ? `/api/solar/building-insights?lat=${lat}&lng=${lng}` : null,
    fetcher
  );

  return { insights: data, isLoading, isError: !!error, mutate };
}
