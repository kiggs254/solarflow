import useSWR from "swr";
import type { BuildingInsights } from "@/types/solar";
import type { SolarApiResponse, NormalizedSolarData, SolarProviderName } from "@/types/solar-providers";
import type { SolarApiErrorCode } from "@/lib/solar-api";

async function buildingInsightsFetcher(url: string): Promise<SolarApiResponse> {
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
  return data as SolarApiResponse;
}

export function useBuildingInsights(lat: number | null, lng: number | null) {
  const shouldFetch = lat !== null && lng !== null && lat !== 0 && lng !== 0;

  const { data, error, isLoading, mutate } = useSWR<SolarApiResponse>(
    shouldFetch ? `/api/solar/building-insights?lat=${lat}&lng=${lng}` : null,
    buildingInsightsFetcher
  );

  const err = error as (Error & { status?: number; code?: SolarApiErrorCode }) | undefined;

  // Backward-compat: expose the raw BuildingInsights when Google is the provider
  const insights: BuildingInsights | undefined =
    data?.provider === "GOOGLE" ? (data.data as BuildingInsights) : undefined;

  const normalized: NormalizedSolarData | undefined = data?.normalized;
  const provider: SolarProviderName | undefined = data?.provider;

  return {
    /** Raw Google BuildingInsights — defined only when provider === 'GOOGLE' */
    insights,
    /** Normalized data available from all providers */
    normalized,
    provider,
    solarResponse: data,
    isLoading,
    isError: !!error,
    errorMessage: err?.message,
    errorCode: err?.code,
    mutate,
  };
}
