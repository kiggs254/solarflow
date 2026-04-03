import type { BuildingInsights } from "@/types/solar";
import type { NormalizedSolarData, SolarProviderName } from "@/types/solar-providers";

export interface SolarProviderFetchResult {
  normalized: NormalizedSolarData;
  /** Present only for Google provider */
  raw?: BuildingInsights;
}

export interface SolarProvider {
  readonly name: SolarProviderName;
  readonly requiresApiKey: boolean;
  fetch(lat: number, lng: number): Promise<SolarProviderFetchResult>;
}
