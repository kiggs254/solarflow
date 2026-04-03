import type { BuildingInsights, RoofSegmentSizeAndSunshineStats, SolarPanelConfig } from "./solar";

export type SolarProviderName = "GOOGLE" | "PVGIS" | "NREL" | "NASA" | "OPEN_METEO";

export type CoverageQuality = "HIGH" | "MEDIUM" | "LOW";

export interface NormalizedSolarData {
  dataSource: SolarProviderName;
  coverageQuality: CoverageQuality;
  /** Total sunshine hours per year */
  annualSunshineHours: number;
  /** Global horizontal irradiance kWh/m²/year */
  annualIrradiance: number;
  /** Estimated AC output for a reference 4 kWp system, kWh/year */
  annualEnergyOutputKwh: number;
  /** Monthly AC energy output (12 values, kWh). Empty array when provider doesn't return monthly data. */
  monthlyBreakdown: number[];
  /** Optimal panel tilt in degrees */
  optimalTilt: number;
  /** Optimal panel azimuth in degrees (180 = south) */
  optimalAzimuth: number;
  /** Present only for Google Solar API responses */
  roofAnalysis?: {
    areaMeters2: number;
    maxSunshineHoursPerYear: number;
    maxArrayPanelsCount: number;
    panelCapacityWatts: number;
    roofSegmentStats: RoofSegmentSizeAndSunshineStats[];
    solarPanelConfigs: SolarPanelConfig[];
    carbonOffsetFactorKgPerMwh: number;
    imageryQuality: "HIGH" | "MEDIUM" | "LOW";
  };
}

export type GoogleSolarApiResponse = {
  provider: "GOOGLE";
  data: BuildingInsights;
  normalized: NormalizedSolarData;
  meta: { attemptedProviders: SolarProviderName[] };
};

export type OtherSolarApiResponse = {
  provider: Exclude<SolarProviderName, "GOOGLE">;
  data: NormalizedSolarData;
  normalized: NormalizedSolarData;
  meta: { attemptedProviders: SolarProviderName[] };
};

export type SolarApiResponse = GoogleSolarApiResponse | OtherSolarApiResponse;

export function isGoogleResponse(r: SolarApiResponse): r is GoogleSolarApiResponse {
  return r.provider === "GOOGLE";
}
