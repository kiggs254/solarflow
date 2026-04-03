import { SolarApiError } from "@/lib/solar-api";
import { decryptApiKey } from "@/lib/crypto";
import type { NormalizedSolarData } from "@/types/solar-providers";
import type { SolarProvider, SolarProviderFetchResult } from "./types";

const REFERENCE_SYSTEM_KWP = 4;
const DEFAULT_TILT = 20;
const DEFAULT_AZIMUTH = 180;
const DEFAULT_LOSSES = 14;

interface NrelResponse {
  errors?: string[];
  warnings?: string[];
  outputs?: {
    ac_annual?: number;
    ac_monthly?: number[];
    solrad_annual?: number;
    dc_monthly?: number[];
  };
  inputs?: Record<string, unknown>;
}

export function makeNrelProvider(encryptedKey: string): SolarProvider {
  return {
    name: "NREL",
    requiresApiKey: true,

    async fetch(lat: number, lng: number): Promise<SolarProviderFetchResult> {
      let apiKey: string;
      try {
        apiKey = decryptApiKey(encryptedKey);
      } catch (e) {
        throw new SolarApiError(
          e instanceof Error ? e.message : "Could not decrypt NREL API key",
          "NOT_CONFIGURED",
          503
        );
      }

      const params = new URLSearchParams({
        api_key: apiKey,
        lat: String(lat),
        lon: String(lng),
        system_capacity: String(REFERENCE_SYSTEM_KWP),
        tilt: String(DEFAULT_TILT),
        azimuth: String(DEFAULT_AZIMUTH),
        losses: String(DEFAULT_LOSSES),
        array_type: "1", // fixed open rack
        module_type: "0", // standard
        timeframe: "monthly",
      });

      const url = `https://developer.nrel.gov/api/pvwatts/v8.json?${params}`;

      let res: Response;
      try {
        res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      } catch (e) {
        throw new SolarApiError(
          e instanceof Error ? e.message : "Could not reach NREL API",
          "NETWORK",
          502
        );
      }

      let body: NrelResponse;
      try {
        body = (await res.json()) as NrelResponse;
      } catch {
        throw new SolarApiError("NREL returned an unreadable response", "UPSTREAM_ERROR", 502);
      }

      if (body.errors && body.errors.length > 0) {
        const msg = body.errors[0];
        if (msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("invalid key")) {
          throw new SolarApiError(
            "NREL API key is invalid or expired. Update it in Settings → Solar APIs.",
            "NOT_CONFIGURED",
            503
          );
        }
        if (msg.toLowerCase().includes("no resource") || msg.toLowerCase().includes("outside")) {
          throw new SolarApiError(
            "No NREL data available for this location.",
            "NO_DATA",
            404
          );
        }
        throw new SolarApiError(`NREL error: ${msg}`, "UPSTREAM_ERROR", 502);
      }

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          throw new SolarApiError(
            "NREL API key rejected. Update it in Settings → Solar APIs.",
            "NOT_CONFIGURED",
            503
          );
        }
        throw new SolarApiError(`NREL API returned HTTP ${res.status}`, "UPSTREAM_ERROR", 502);
      }

      const outputs = body.outputs;
      if (!outputs?.ac_annual) {
        throw new SolarApiError("NREL returned no energy data for this location", "NO_DATA", 404);
      }

      const acAnnual = outputs.ac_annual; // kWh/year for REFERENCE_SYSTEM_KWP
      const acMonthly = outputs.ac_monthly ?? [];
      // solrad_annual is kWh/m²/day; convert to kWh/m²/year
      const annualIrradiance = (outputs.solrad_annual ?? 0) * 365;
      const annualSunshineHours = Math.round((outputs.solrad_annual ?? 0) * 365);

      const monthlyBreakdown = acMonthly.map((v) => Math.round(v));

      const normalized: NormalizedSolarData = {
        dataSource: "NREL",
        coverageQuality: "HIGH", // NSRDB has global coverage
        annualSunshineHours,
        annualIrradiance,
        annualEnergyOutputKwh: Math.round(acAnnual),
        monthlyBreakdown,
        optimalTilt: DEFAULT_TILT,
        optimalAzimuth: DEFAULT_AZIMUTH,
      };

      return { normalized };
    },
  };
}
