export type LatLng = { lat: number; lng: number };

export type RegionBoundsLike = {
  north: number;
  south: number;
  east: number;
  west: number;
};

const EARTH_RADIUS_M = 6_378_137;
const DEG_TO_RAD = Math.PI / 180;

export function polygonBBox(vertices: LatLng[]): RegionBoundsLike {
  if (vertices.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }
  let north = vertices[0].lat;
  let south = vertices[0].lat;
  let east = vertices[0].lng;
  let west = vertices[0].lng;
  for (let i = 1; i < vertices.length; i++) {
    const v = vertices[i];
    if (v.lat > north) north = v.lat;
    if (v.lat < south) south = v.lat;
    if (v.lng > east) east = v.lng;
    if (v.lng < west) west = v.lng;
  }
  return { north, south, east, west };
}

/**
 * Equirectangular shoelace area in m². Good enough for roof-scale polygons.
 * The client prefers google.maps.geometry.spherical.computeArea for display.
 */
export function shoelaceAreaM2(vertices: LatLng[]): number {
  if (vertices.length < 3) return 0;
  const meanLat =
    vertices.reduce((s, v) => s + v.lat, 0) / vertices.length;
  const mPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;
  const mPerDegLng = mPerDegLat * Math.cos(meanLat * DEG_TO_RAD);
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const ax = a.lng * mPerDegLng;
    const ay = a.lat * mPerDegLat;
    const bx = b.lng * mPerDegLng;
    const by = b.lat * mPerDegLat;
    sum += ax * by - bx * ay;
  }
  return Math.abs(sum) / 2;
}

/** Area-weighted centroid of a simple polygon (equirectangular approximation). */
export function polygonCentroid(vertices: LatLng[]): LatLng {
  if (vertices.length === 0) return { lat: 0, lng: 0 };
  if (vertices.length === 1) return vertices[0];
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const cross = a.lng * b.lat - b.lng * a.lat;
    twiceArea += cross;
    cx += (a.lng + b.lng) * cross;
    cy += (a.lat + b.lat) * cross;
  }
  if (twiceArea === 0) {
    // Degenerate (all collinear): fall back to bbox midpoint.
    const b = polygonBBox(vertices);
    return { lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 };
  }
  return { lat: cy / (3 * twiceArea), lng: cx / (3 * twiceArea) };
}

/** Ray-cast point-in-polygon (2D lat/lng). Returns true if the point is inside the ring. */
export function pointInPolygonRing(
  lat: number,
  lng: number,
  vertices: LatLng[]
): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const vi = vertices[i];
    const vj = vertices[j];
    const intersect =
      vi.lat > lat !== vj.lat > lat &&
      lng < ((vj.lng - vi.lng) * (lat - vi.lat)) / (vj.lat - vi.lat + 1e-12) + vi.lng;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Detects whether any two non-adjacent edges in the ring intersect. */
export function isSelfIntersecting(vertices: LatLng[]): boolean {
  const n = vertices.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = vertices[i];
    const a2 = vertices[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // Skip adjacent edges (share a vertex) and the wrap-around pair.
      if (j === i || j === (i + 1) % n || (i === 0 && j === n - 1)) continue;
      const b1 = vertices[j];
      const b2 = vertices[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function segmentsIntersect(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);
  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }
  return false;
}

function direction(a: LatLng, b: LatLng, c: LatLng): number {
  return (c.lng - a.lng) * (b.lat - a.lat) - (b.lng - a.lng) * (c.lat - a.lat);
}

export type PanelGridRect = {
  corners: [LatLng, LatLng, LatLng, LatLng];
  center: LatLng;
};

export type SamplePanelGridOptions = {
  vertices: LatLng[];
  bbox?: RegionBoundsLike;
  panelWidthM: number;
  panelHeightM: number;
  /** Fraction of panel footprint used as a gap between panels (0.05 = 5% spacing). */
  gapFraction?: number;
  /** Whether a given lat/lng is inside the polygon. */
  containsFn: (lat: number, lng: number) => boolean;
  /** Hard cap on returned rectangles. */
  maxPanels?: number;
  /** Hard cap on total candidates scanned. */
  maxCandidates?: number;
};

/**
 * Lay down an axis-aligned grid of panel rectangles inside the polygon. Each
 * candidate cell is accepted only if all four corners pass `containsFn`.
 * Degrees per meter are re-derived at the midpoint latitude of each row for
 * accuracy at typical roof sizes.
 */
export function samplePanelGrid(opts: SamplePanelGridOptions): PanelGridRect[] {
  const {
    vertices,
    panelWidthM,
    panelHeightM,
    gapFraction = 0.02,
    containsFn,
    maxPanels = 500,
    maxCandidates = 2000,
  } = opts;
  if (vertices.length < 3 || panelWidthM <= 0 || panelHeightM <= 0) return [];
  const bbox = opts.bbox ?? polygonBBox(vertices);
  const results: PanelGridRect[] = [];

  const stepHeightM = panelHeightM * (1 + gapFraction);
  const stepWidthM = panelWidthM * (1 + gapFraction);

  const mPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;
  const dLat = stepHeightM / mPerDegLat;
  const panelDLat = panelHeightM / mPerDegLat;

  let candidates = 0;
  for (let lat = bbox.south; lat + panelDLat <= bbox.north; lat += dLat) {
    const midLat = lat + panelDLat / 2;
    const mPerDegLng = mPerDegLat * Math.cos(midLat * DEG_TO_RAD);
    if (mPerDegLng <= 0) continue;
    const dLng = stepWidthM / mPerDegLng;
    const panelDLng = panelWidthM / mPerDegLng;
    for (let lng = bbox.west; lng + panelDLng <= bbox.east; lng += dLng) {
      candidates++;
      if (candidates > maxCandidates) return results;
      const c1 = { lat, lng };
      const c2 = { lat, lng: lng + panelDLng };
      const c3 = { lat: lat + panelDLat, lng: lng + panelDLng };
      const c4 = { lat: lat + panelDLat, lng };
      const center = { lat: lat + panelDLat / 2, lng: lng + panelDLng / 2 };
      // Require center + all 4 corners to be inside — prevents panels straddling the edge.
      if (
        containsFn(center.lat, center.lng) &&
        containsFn(c1.lat, c1.lng) &&
        containsFn(c2.lat, c2.lng) &&
        containsFn(c3.lat, c3.lng) &&
        containsFn(c4.lat, c4.lng)
      ) {
        results.push({ corners: [c1, c2, c3, c4], center });
        if (results.length >= maxPanels) return results;
      }
    }
  }
  return results;
}
