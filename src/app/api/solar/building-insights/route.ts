import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchBuildingInsights, SolarApiError } from "@/lib/solar-api";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const data = await fetchBuildingInsights(lat, lng);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SolarApiError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
    }
    console.error("fetchBuildingInsights:", e);
    return NextResponse.json({ error: "Solar data request failed", code: "UNKNOWN" }, { status: 500 });
  }
}
