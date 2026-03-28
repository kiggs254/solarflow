import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchBuildingInsights } from "@/lib/solar-api";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const data = await fetchBuildingInsights(lat, lng);
  return NextResponse.json(data);
}
