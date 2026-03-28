const STATIC_MAPS_BASE = "https://maps.googleapis.com/maps/api/staticmap";

export type GoogleStaticMapSnapshotInput = {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  neLat?: number;
  neLng?: number;
  swLat?: number;
  swLng?: number;
};

export function normalizeGoogleMapsApiKey(key: string | undefined | null): string | null {
  if (key == null) return null;
  const t = key.trim().replace(/^["']|["']$/g, "");
  return t.length ? t : null;
}

export function isLikelyStaticMapImageBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  return false;
}

/**
 * Builds a Google Static Maps URL (satellite + optional region polygon + marker).
 * Shared by the API route and the browser fallback in captureMapSnapshot.
 */
export function buildGoogleStaticMapSnapshotUrl(
  apiKey: string,
  input: GoogleStaticMapSnapshotInput
): string {
  const key = normalizeGoogleMapsApiKey(apiKey);
  if (!key) throw new Error("API key required");

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const zoom = Math.min(21, Math.max(1, Number(input.zoom) || 20));
  const width = Math.min(640, Math.max(100, Number(input.width) || 640));
  const height = Math.min(640, Math.max(100, Number(input.height) || 400));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("lat and lng required");
  }

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    maptype: "satellite",
    key,
  });

  const neLat = input.neLat != null ? Number(input.neLat) : null;
  const neLng = input.neLng != null ? Number(input.neLng) : null;
  const swLat = input.swLat != null ? Number(input.swLat) : null;
  const swLng = input.swLng != null ? Number(input.swLng) : null;

  if (
    neLat != null &&
    neLng != null &&
    swLat != null &&
    swLng != null &&
    [neLat, neLng, swLat, swLng].every(Number.isFinite)
  ) {
    const path = `color:0xF59E0B|weight:2|fillcolor:0xF59E0B55|${swLat},${swLng}|${swLat},${neLng}|${neLat},${neLng}|${neLat},${swLng}|${swLat},${swLng}`;
    params.append("path", path);
  }

  params.append("markers", `color:0xF59E0B|${lat},${lng}`);

  return `${STATIC_MAPS_BASE}?${params.toString()}`;
}
