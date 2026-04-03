import { SolarApiError } from "@/lib/solar-api";
import type { SolarProviderName } from "@/types/solar-providers";
import type { SolarProvider, SolarProviderFetchResult } from "./types";
import { googleProvider } from "./google";
import { pvgisProvider } from "./pvgis";
import { nasaProvider } from "./nasa";
import { openMeteoProvider } from "./open-meteo";
import { makeNrelProvider } from "./nrel";

type ProviderConfig = {
  activeProvider: string;
  fallbackProvider: string | null;
  nrelApiKey: string | null;
};

// Free providers always available as ultimate fallbacks (no key required)
const FREE_FALLBACK_ORDER: SolarProviderName[] = ["PVGIS", "NASA", "OPEN_METEO"];

function resolveProvider(name: string, config: ProviderConfig): SolarProvider | null {
  switch (name as SolarProviderName) {
    case "GOOGLE":
      return googleProvider;
    case "PVGIS":
      return pvgisProvider;
    case "NASA":
      return nasaProvider;
    case "OPEN_METEO":
      return openMeteoProvider;
    case "NREL":
      return config.nrelApiKey ? makeNrelProvider(config.nrelApiKey) : null;
    default:
      return null;
  }
}

/** Errors that should trigger a fallback attempt (coverage/config issues) */
function isFallbackable(code: string): boolean {
  return code === "NO_DATA" || code === "NOT_CONFIGURED";
}

export async function fetchWithFallback(
  config: ProviderConfig,
  lat: number,
  lng: number
): Promise<{
  result: SolarProviderFetchResult;
  usedProvider: SolarProviderName;
  attemptedProviders: SolarProviderName[];
}> {
  const attemptedProviders: SolarProviderName[] = [];

  // Build the ordered list of providers to try
  const toTry: SolarProviderName[] = [];
  toTry.push(config.activeProvider as SolarProviderName);

  if (config.fallbackProvider && !toTry.includes(config.fallbackProvider as SolarProviderName)) {
    toTry.push(config.fallbackProvider as SolarProviderName);
  }

  // Always append free fallbacks (deduped) so there's always something to try
  for (const name of FREE_FALLBACK_ORDER) {
    if (!toTry.includes(name)) {
      toTry.push(name);
    }
  }

  let lastError: SolarApiError | null = null;

  for (const name of toTry) {
    const provider = resolveProvider(name, config);
    if (!provider) {
      // Provider not configurable (e.g. NREL without a key) — skip silently
      continue;
    }

    attemptedProviders.push(name);

    try {
      const result = await provider.fetch(lat, lng);
      return { result, usedProvider: name, attemptedProviders };
    } catch (e) {
      if (e instanceof SolarApiError) {
        if (!isFallbackable(e.code)) {
          // Transient error — surface immediately, don't try other providers
          throw e;
        }
        lastError = e;
        // Continue to next provider
      } else {
        throw e;
      }
    }
  }

  // All providers failed
  throw (
    lastError ??
    new SolarApiError(
      "No solar data available for this location from any configured provider.",
      "NO_DATA",
      404
    )
  );
}
