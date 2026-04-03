import { SolarApiError } from "@/lib/solar-api";
import type { NormalizedSolarData } from "@/types/solar-providers";
import type { SolarProvider, SolarProviderFetchResult } from "./types";

// PVGIS geographic coverage quality heuristic:
// SARAH3 database covers Europe, Africa, and most of Asia/Americas with high quality
function getPvgisCoverageQuality(lat: number, lng: number): "HIGH" | "MEDIUM" | "LOW" {
  // Rough bounding box for PVGIS-SARAH3 primary coverage
  if (lat >= -60 && lat <= 65 && lng >= -30 && lng <= 65) return "HIGH"; // Europe + Africa + MENA
  if (lat >= -60 && lat <= 65 && lng >= 65 && lng <= 160) return "HIGH"; // Asia
  if (lat >= -60 && lat <= 60 && lng >= -120 && lng <= -30) return "HIGH"; // Americas
  return "MEDIUM";
}

interface PvgisResponse {
  outputs?: {
    totals?: {
      fixed?: {
        "E_y"?: number; // Annual energy output kWh/kWp
        "H(i)_y"?: number; // Annual irradiation kWh/m²
        "SD_y"?: number;
      };
    };
    monthly?: {
      fixed?: Array<{ month: number; "E_m": number; "H(i)_m": number }>;
    };
  };
  inputs?: {
    mounting_system?: {
      fixed?: {
        slope?: { value: number; optimal: boolean };
        azimuth?: { value: number; optimal: boolean };
      };
    };
  };
  status?: string;
  message?: string;
}

const REFERENCE_SYSTEM_KWP = 4;
const SYSTEM_LOSS_PERCENT = 14;

export const pvgisProvider: SolarProvider = {
  name: "PVGIS",
  requiresApiKey: false,

  async fetch(lat: number, lng: number): Promise<SolarProviderFetchResult> {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng), // PVGIS uses "lon" not "lng"
      peakpower: String(REFERENCE_SYSTEM_KWP),
      loss: String(SYSTEM_LOSS_PERCENT),
      outputformat: "json",
      optimalangles: "1", // ask PVGIS to compute optimal tilt/azimuth
    });

    const url = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?${params}`;

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    } catch (e) {
      throw new SolarApiError(
        e instanceof Error ? e.message : "Could not reach PVGIS API",
        "NETWORK",
        502
      );
    }

    let body: PvgisResponse;
    try {
      body = (await res.json()) as PvgisResponse;
    } catch {
      throw new SolarApiError("PVGIS returned an unreadable response", "UPSTREAM_ERROR", 502);
    }

    if (!res.ok || body.status === "error") {
      const msg = body.message ?? `PVGIS HTTP ${res.status}`;
      if (res.status === 400 && msg.toLowerCase().includes("location")) {
        throw new SolarApiError(
          "No PVGIS data for this location. Try a different coordinate.",
          "NO_DATA",
          404
        );
      }
      throw new SolarApiError(`PVGIS error: ${msg}`, "UPSTREAM_ERROR", 502);
    }

    const totals = body.outputs?.totals?.fixed;
    const monthly = body.outputs?.monthly?.fixed ?? [];
    const mountingFixed = body.inputs?.mounting_system?.fixed;

    if (!totals?.["E_y"]) {
      throw new SolarApiError("PVGIS returned no energy data for this location", "NO_DATA", 404);
    }

    const annualEnergyKwhPerKwp = totals["E_y"]!;
    const annualIrradiance = totals["H(i)_y"] ?? annualEnergyKwhPerKwp; // kWh/m²/yr
    const annualEnergyOutputKwh = Math.round(annualEnergyKwhPerKwp * REFERENCE_SYSTEM_KWP);

    // Monthly breakdown: sum to 12 values (PVGIS returns per-month totals)
    const monthlyBreakdown: number[] = Array.from({ length: 12 }, (_, i) => {
      const entry = monthly.find((m) => m.month === i + 1);
      return entry ? Math.round(entry["E_m"] * REFERENCE_SYSTEM_KWP) : 0;
    });

    const optimalTilt = mountingFixed?.slope?.value ?? 30;
    const optimalAzimuth = mountingFixed?.azimuth?.value ?? 180;

    // PVGIS returns hours/year as irradiance; approximate sunshine hours from irradiance
    const annualSunshineHours = Math.round(annualIrradiance * 1.1); // rough conversion factor

    const normalized: NormalizedSolarData = {
      dataSource: "PVGIS",
      coverageQuality: getPvgisCoverageQuality(lat, lng),
      annualSunshineHours,
      annualIrradiance,
      annualEnergyOutputKwh,
      monthlyBreakdown,
      optimalTilt,
      optimalAzimuth,
    };

    return { normalized };
  },
};
