import { fetchBuildingInsights, SolarApiError } from "@/lib/solar-api";
import type { BuildingInsights } from "@/types/solar";
import type { NormalizedSolarData } from "@/types/solar-providers";
import type { SolarProvider, SolarProviderFetchResult } from "./types";

function normalizeGoogle(b: BuildingInsights): NormalizedSolarData {
  const sp = b.solarPotential;
  // Use the highest-panel-count config as the reference output estimate
  const best = sp.solarPanelConfigs.at(-1);
  // Google reports hours of peak sun, not kWh/m² — treat them as equivalent for display purposes
  const annualIrradiance = sp.maxSunshineHoursPerYear;
  // Derive a 4 kWp reference output from the best config (scaled by 4/system_size)
  const refKwp = 4;
  const annualEnergyOutputKwh = best
    ? (best.yearlyEnergyDcKwh / (sp.maxArrayPanelsCount * (sp.panelCapacityWatts / 1000))) * refKwp
    : 0;

  const primarySegment = sp.roofSegmentStats[0];

  return {
    dataSource: "GOOGLE",
    coverageQuality: b.imageryQuality,
    annualSunshineHours: sp.maxSunshineHoursPerYear,
    annualIrradiance,
    annualEnergyOutputKwh: Math.round(annualEnergyOutputKwh),
    monthlyBreakdown: [], // Google Solar API does not return monthly breakdown
    optimalTilt: primarySegment?.pitchDegrees ?? 20,
    optimalAzimuth: primarySegment?.azimuthDegrees ?? 180,
    roofAnalysis: {
      areaMeters2: sp.wholeRoofStats.areaMeters2,
      maxSunshineHoursPerYear: sp.maxSunshineHoursPerYear,
      maxArrayPanelsCount: sp.maxArrayPanelsCount,
      panelCapacityWatts: sp.panelCapacityWatts,
      roofSegmentStats: sp.roofSegmentStats,
      solarPanelConfigs: sp.solarPanelConfigs,
      carbonOffsetFactorKgPerMwh: sp.carbonOffsetFactorKgPerMwh,
      imageryQuality: b.imageryQuality,
    },
  };
}

export const googleProvider: SolarProvider = {
  name: "GOOGLE",
  requiresApiKey: true,

  async fetch(lat: number, lng: number): Promise<SolarProviderFetchResult> {
    const raw: BuildingInsights = await fetchBuildingInsights(lat, lng);
    return { normalized: normalizeGoogle(raw), raw };
  },
};
