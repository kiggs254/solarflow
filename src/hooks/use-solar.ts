import useSWR from "swr";
import type { BuildingInsights } from "@/types/solar";
import type { SolarApiErrorCode } from "@/lib/solar-api";

async function buildingInsightsFetcher(url: string): Promise<BuildingInsights> {
  const res = await fetch(url);
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const body = data as { error?: string; code?: SolarApiErrorCode };
    const msg = typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    const err = new Error(msg) as Error & { status?: number; code?: SolarApiErrorCode };
    err.status = res.status;
    err.code = body.code;
    throw err;
  }
  return data as BuildingInsights;
}

export function useBuildingInsights(lat: number | null, lng: number | null) {
  const shouldFetch = lat !== null && lng !== null && lat !== 0 && lng !== 0;

  const { data, error, isLoading, mutate } = useSWR<BuildingInsights>(
    shouldFetch ? `/api/solar/building-insights?lat=${lat}&lng=${lng}` : null,
    buildingInsightsFetcher
  );

  const err = error as (Error & { status?: number; code?: SolarApiErrorCode }) | undefined;

  return {
    insights: data,
    isLoading,
    isError: !!error,
    errorMessage: err?.message,
    errorCode: err?.code,
    mutate,
  };
}
