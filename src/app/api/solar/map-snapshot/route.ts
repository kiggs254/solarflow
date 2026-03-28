import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildGoogleStaticMapSnapshotUrl,
  isLikelyStaticMapImageBytes,
  normalizeGoogleMapsApiKey,
} from "@/lib/google-static-map-snapshot";

/** Browser-restricted Maps keys require a matching Referer on requests to Google. */
function refererForGoogleStaticMaps(req: NextRequest): string | undefined {
  const fromClient = req.headers.get("referer") || req.headers.get("referrer");
  if (fromClient) {
    try {
      new URL(fromClient);
      return fromClient;
    } catch {
      /* ignore */
    }
  }
  const base =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return undefined;
  try {
    return new URL(base).origin + "/";
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = normalizeGoogleMapsApiKey(
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  );
  if (!apiKey) {
    return NextResponse.json({ error: "Maps API key not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const zoom = Math.min(21, Math.max(1, Number(body.zoom) || 20));
  const width = Math.min(640, Math.max(100, Number(body.width) || 640));
  const height = Math.min(640, Math.max(100, Number(body.height) || 400));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const neLat = body.neLat != null ? Number(body.neLat) : null;
  const neLng = body.neLng != null ? Number(body.neLng) : null;
  const swLat = body.swLat != null ? Number(body.swLat) : null;
  const swLng = body.swLng != null ? Number(body.swLng) : null;

  const region =
    neLat != null &&
    neLng != null &&
    swLat != null &&
    swLng != null &&
    [neLat, neLng, swLat, swLng].every(Number.isFinite)
      ? { neLat, neLng, swLat, swLng }
      : {};

  let url: string;
  try {
    url = buildGoogleStaticMapSnapshotUrl(apiKey, {
      lat,
      lng,
      zoom,
      width,
      height,
      ...region,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid snapshot parameters", detail: String(e) },
      { status: 400 }
    );
  }

  const referer = refererForGoogleStaticMaps(req);
  const res = await fetch(url, {
    headers: {
      ...(referer ? { Referer: referer } : {}),
    },
  });

  const buf = Buffer.from(await res.arrayBuffer());
  const bytes = new Uint8Array(buf);

  if (!res.ok) {
    const text = new TextDecoder().decode(bytes.slice(0, 600));
    return NextResponse.json(
      {
        error: "Static map failed",
        upstreamStatus: res.status,
        detail: text,
        hint:
          res.status === 403
            ? "Enable “Maps Static API” for this key’s Google Cloud project and ensure billing is on. If the key is restricted, add a server key in GOOGLE_MAPS_API_KEY or capture from the browser (the app tries that first when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set)."
            : undefined,
      },
      { status: 502 }
    );
  }

  if (!isLikelyStaticMapImageBytes(bytes)) {
    const text = new TextDecoder().decode(bytes.slice(0, 600));
    return NextResponse.json(
      {
        error: "Static map returned a non-image response",
        upstreamStatus: res.status,
        detail: text,
      },
      { status: 502 }
    );
  }

  const base64 = buf.toString("base64");
  const mime = res.headers.get("content-type") || "image/png";

  return NextResponse.json({
    dataUrl: `data:${mime};base64,${base64}`,
    base64,
    mime,
  });
}
