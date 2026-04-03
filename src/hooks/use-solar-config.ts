import useSWR from "swr";
import type { SolarProviderName } from "@/types/solar-providers";

export interface SolarConfig {
  activeProvider: SolarProviderName;
  fallbackProvider: SolarProviderName | null;
  nrelConfigured: boolean;
}

async function fetcher(url: string): Promise<SolarConfig> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load solar config (${res.status})`);
  return res.json() as Promise<SolarConfig>;
}

export function useSolarConfig() {
  const { data, error, isLoading, mutate } = useSWR<SolarConfig>(
    "/api/settings/solar",
    fetcher
  );

  return {
    config: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export async function saveSolarConfig(payload: {
  activeProvider: SolarProviderName;
  fallbackProvider: SolarProviderName | null;
  nrelApiKey?: string;
}): Promise<void> {
  const res = await fetch("/api/settings/solar", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Save failed (${res.status})`);
  }
}
