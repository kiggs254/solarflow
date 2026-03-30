import type { BuildingInsights } from "@/types/solar";

const SOLAR_API_BASE = "https://solar.googleapis.com/v1";

export type SolarApiErrorCode = "NOT_CONFIGURED" | "NO_DATA" | "UPSTREAM_ERROR" | "NETWORK";

export class SolarApiError extends Error {
  readonly code: SolarApiErrorCode;
  readonly httpStatus: number;

  constructor(message: string, code: SolarApiErrorCode, httpStatus: number) {
    super(message);
    this.name = "SolarApiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/**
 * Fetches Building Insights from Google Solar API. Coverage is not worldwide:
 * 404 means no building model exists for that point (imagery / processing gaps).
 */
export async function fetchBuildingInsights(lat: number, lng: number): Promise<BuildingInsights> {
  const apiKey = process.env.GOOGLE_SOLAR_API_KEY;

  if (!apiKey?.trim()) {
    throw new SolarApiError(
      "Solar analysis is not configured: set GOOGLE_SOLAR_API_KEY on the server.",
      "NOT_CONFIGURED",
      503
    );
  }

  const url = `${SOLAR_API_BASE}/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      let bodySnippet = "";
      try {
        bodySnippet = (await response.text()).slice(0, 400);
      } catch {
        /* ignore */
      }
      if (bodySnippet) {
        console.warn("Solar buildingInsights:findClosest 404", { lat, lng, bodySnippet });
      } else {
        console.warn("Solar buildingInsights:findClosest 404 (no body)", { lat, lng });
      }
      throw new SolarApiError(
        "No solar building data for this location. Google only publishes models where aerial imagery and processing support it—try another address or a spot clearly on a mapped roof.",
        "NO_DATA",
        404
      );
    }

    if (!response.ok) {
      let bodySnippet = "";
      try {
        bodySnippet = (await response.text()).slice(0, 400);
      } catch {
        /* ignore */
      }
      console.warn(`Solar API HTTP ${response.status}`, { lat, lng, bodySnippet });
      const status =
        response.status === 401 || response.status === 403
          ? 503
          : response.status >= 500
            ? 502
            : 400;
      throw new SolarApiError(
        response.status === 403 || response.status === 401
          ? "Solar API rejected the request. Check that GOOGLE_SOLAR_API_KEY is valid and the Solar API is enabled for your Google Cloud project."
          : `Solar API returned HTTP ${response.status}.`,
        "UPSTREAM_ERROR",
        status
      );
    }

    return response.json() as Promise<BuildingInsights>;
  } catch (e) {
    if (e instanceof SolarApiError) throw e;
    console.warn("Solar API network/parse error:", e);
    throw new SolarApiError(
      e instanceof Error ? e.message : "Could not reach Solar API",
      "NETWORK",
      502
    );
  }
}
