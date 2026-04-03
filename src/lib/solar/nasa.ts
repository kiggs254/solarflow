import { SolarApiError } from "@/lib/solar-api";
import type { NormalizedSolarData } from "@/types/solar-providers";
import type { SolarProvider, SolarProviderFetchResult } from "./types";

const REFERENCE_SYSTEM_KWP = 4;
const SYSTEM_EFFICIENCY = 0.8; // 80% for reference system

// NASA POWER returns data keyed by YYYYMM for the requested multi-year range
type NasaMonthlyValues = Record<string, number>; // { "202101": 4.5, "202102": 5.1, ... }

interface NasaPowerResponse {
  properties?: {
    parameter?: {
      ALLSKY_SFC_SW_DWN?: NasaMonthlyValues;
    };
  };
  header?: {
    title?: string;
  };
  messages?: string[];
}

/** Average monthly values from a multi-year YYYYMM keyed record, returning 12 values (Jan–Dec) */
function averageMonthlyOverYears(data: NasaMonthlyValues): number[] {
  const sums: number[] = new Array(12).fill(0);
  const counts: number[] = new Array(12).fill(0);

  for (const [key, value] of Object.entries(data)) {
    if (value < 0) continue; // NASA uses -999 for missing data
    const month = parseInt(key.slice(4), 10) - 1; // YYYYMM → 0-indexed month
    if (month >= 0 && month < 12) {
      sums[month] += value;
      counts[month]++;
    }
  }

  return sums.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : 0));
}

export const nasaProvider: SolarProvider = {
  name: "NASA",
  requiresApiKey: false,

  async fetch(lat: number, lng: number): Promise<SolarProviderFetchResult> {
    // Fetch 3 years of monthly data to get stable averages
    const params = new URLSearchParams({
      parameters: "ALLSKY_SFC_SW_DWN",
      community: "RE",
      longitude: String(lng),
      latitude: String(lat),
      format: "JSON",
      start: "2021",
      end: "2023",
    });

    const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?${params}`;

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    } catch (e) {
      throw new SolarApiError(
        e instanceof Error ? e.message : "Could not reach NASA POWER API",
        "NETWORK",
        502
      );
    }

    let body: NasaPowerResponse;
    try {
      body = (await res.json()) as NasaPowerResponse;
    } catch {
      throw new SolarApiError("NASA POWER returned an unreadable response", "UPSTREAM_ERROR", 502);
    }

    if (!res.ok) {
      throw new SolarApiError(`NASA POWER API returned HTTP ${res.status}`, "UPSTREAM_ERROR", 502);
    }

    const rawData = body.properties?.parameter?.ALLSKY_SFC_SW_DWN;
    if (!rawData || Object.keys(rawData).length === 0) {
      throw new SolarApiError("No solar irradiance data from NASA POWER for this location", "NO_DATA", 404);
    }

    // avgMonthly is in kWh/m²/day (NASA unit for ALLSKY_SFC_SW_DWN)
    const avgMonthly = averageMonthlyOverYears(rawData);
    const daysPerMonth = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Convert kWh/m²/day to kWh/m²/month, then derive monthly energy output for reference system
    const monthlyIrradianceKwhM2 = avgMonthly.map((v, i) => v * daysPerMonth[i]);
    const annualIrradiance = Math.round(monthlyIrradianceKwhM2.reduce((a, b) => a + b, 0));
    const annualSunshineHours = Math.round(annualIrradiance); // approx: 1 kWh/m² ≈ 1 peak sun hour

    // Reference energy output: irradiance × system size × efficiency
    const annualEnergyOutputKwh = Math.round(annualIrradiance * REFERENCE_SYSTEM_KWP * SYSTEM_EFFICIENCY);
    const monthlyBreakdown = monthlyIrradianceKwhM2.map((irr) =>
      Math.round(irr * REFERENCE_SYSTEM_KWP * SYSTEM_EFFICIENCY)
    );

    const normalized: NormalizedSolarData = {
      dataSource: "NASA",
      coverageQuality: "MEDIUM", // 0.5° resolution — not rooftop level
      annualSunshineHours,
      annualIrradiance,
      annualEnergyOutputKwh,
      monthlyBreakdown,
      optimalTilt: Math.abs(lat) * 0.9, // simple rule-of-thumb: tilt ≈ 0.9 × latitude
      optimalAzimuth: lat >= 0 ? 180 : 0, // north hemisphere faces south, south faces north
    };

    return { normalized };
  },
};
