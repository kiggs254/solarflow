import { SolarApiError } from "@/lib/solar-api";
import type { NormalizedSolarData } from "@/types/solar-providers";
import type { SolarProvider, SolarProviderFetchResult } from "./types";

const REFERENCE_SYSTEM_KWP = 4;
const PANEL_EFFICIENCY = 0.20; // 20% standard panel efficiency
const SYSTEM_LOSSES = 0.80; // 80% (accounts for inverter, wiring, temperature losses)

interface OpenMeteoResponse {
  hourly?: {
    time?: string[];
    shortwave_radiation?: number[];
  };
  error?: boolean;
  reason?: string;
}

export const openMeteoProvider: SolarProvider = {
  name: "OPEN_METEO",
  requiresApiKey: false,

  async fetch(lat: number, lng: number): Promise<SolarProviderFetchResult> {
    // Fetch 92 days of hourly data (maximum allowed in one request)
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      hourly: "shortwave_radiation",
      forecast_days: "92",
      timezone: "UTC",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    } catch (e) {
      throw new SolarApiError(
        e instanceof Error ? e.message : "Could not reach Open-Meteo API",
        "NETWORK",
        502
      );
    }

    let body: OpenMeteoResponse;
    try {
      body = (await res.json()) as OpenMeteoResponse;
    } catch {
      throw new SolarApiError("Open-Meteo returned an unreadable response", "UPSTREAM_ERROR", 502);
    }

    if (body.error) {
      throw new SolarApiError(body.reason ?? "Open-Meteo API error", "UPSTREAM_ERROR", 502);
    }

    if (!res.ok) {
      throw new SolarApiError(`Open-Meteo API returned HTTP ${res.status}`, "UPSTREAM_ERROR", 502);
    }

    const radiation = body.hourly?.shortwave_radiation ?? [];
    if (radiation.length === 0) {
      throw new SolarApiError("No radiation data from Open-Meteo for this location", "NO_DATA", 404);
    }

    // Sum all hourly values (W/m²) → total Wh/m² for 92 days
    // Divide by 1000 to get kWh/m², then scale to annual
    const totalWh = radiation.reduce((sum, v) => sum + (v ?? 0), 0);
    const irradiance92Days = totalWh / 1000; // kWh/m² over 92 days
    const annualIrradiance = Math.round((irradiance92Days / 92) * 365);
    const annualSunshineHours = Math.round(annualIrradiance);

    // Energy output = irradiance × panel area for 4kWp × efficiency × system losses
    // 4kWp at ~20% efficiency ≈ 20m² of panels
    const panelAreaM2 = (REFERENCE_SYSTEM_KWP * 1000) / (1000 * PANEL_EFFICIENCY); // ~20m²
    const annualEnergyOutputKwh = Math.round(annualIrradiance * panelAreaM2 * PANEL_EFFICIENCY * SYSTEM_LOSSES);

    // Build monthly breakdown by grouping the 92-day hourly data into months
    const times = body.hourly?.time ?? [];
    const monthlyWh: number[] = new Array(12).fill(0);
    for (let i = 0; i < times.length; i++) {
      const month = parseInt(times[i].slice(5, 7), 10) - 1; // "2025-04-01T00:00" → month index
      if (month >= 0 && month < 12) {
        monthlyWh[month] += (radiation[i] ?? 0);
      }
    }

    // Scale observed months to full-month estimates (some months may have partial data)
    // Use the observed data directly scaled to annual
    const observedTotal = monthlyWh.reduce((a, b) => a + b, 0);
    const scalingFactor = observedTotal > 0 ? (irradiance92Days * 1000) / observedTotal : 0;
    const monthlyBreakdown = monthlyWh.map((wh) => {
      const irr = (wh * scalingFactor) / 1000; // kWh/m²
      return Math.round(irr * panelAreaM2 * PANEL_EFFICIENCY * SYSTEM_LOSSES);
    });

    const normalized: NormalizedSolarData = {
      dataSource: "OPEN_METEO",
      coverageQuality: "LOW", // forecast-based, not historical averages
      annualSunshineHours,
      annualIrradiance,
      annualEnergyOutputKwh,
      monthlyBreakdown,
      optimalTilt: Math.round(Math.abs(lat) * 0.9),
      optimalAzimuth: lat >= 0 ? 180 : 0,
    };

    return { normalized };
  },
};
