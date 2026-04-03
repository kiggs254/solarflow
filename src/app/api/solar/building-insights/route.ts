import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SolarApiError } from "@/lib/solar-api";
import { fetchWithFallback } from "@/lib/solar/registry";
import type { SolarApiResponse, SolarProviderName } from "@/types/solar-providers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  // Load active provider config from DB (fall back to Google defaults if no row exists yet)
  const config = await prisma.solarProviderConfig.findUnique({ where: { id: "singleton" } });
  const effectiveConfig = {
    activeProvider: config?.activeProvider ?? "GOOGLE",
    fallbackProvider: config?.fallbackProvider ?? null,
    nrelApiKey: config?.nrelApiKey ?? null,
  };

  try {
    const { result, usedProvider, attemptedProviders } = await fetchWithFallback(
      effectiveConfig,
      lat,
      lng
    );

    const response: SolarApiResponse =
      usedProvider === "GOOGLE"
        ? {
            provider: "GOOGLE",
            data: result.raw!,
            normalized: result.normalized,
            meta: { attemptedProviders: attemptedProviders as SolarProviderName[] },
          }
        : {
            provider: usedProvider as Exclude<SolarProviderName, "GOOGLE">,
            data: result.normalized,
            normalized: result.normalized,
            meta: { attemptedProviders: attemptedProviders as SolarProviderName[] },
          };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof SolarApiError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
    }
    console.error("fetchWithFallback:", e);
    return NextResponse.json({ error: "Solar data request failed", code: "UNKNOWN" }, { status: 500 });
  }
}
