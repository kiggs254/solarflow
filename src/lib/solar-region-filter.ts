import type {
  BuildingInsights,
  RoofSegmentSizeAndSunshineStats,
  SolarPanel,
  SolarPanelConfig,
} from "@/types/solar";

/** Same shape as drawn region on the map (axis-aligned lat/lng). */
export type SolarMapRegionBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

function normalizeSegmentBBox(seg: RoofSegmentSizeAndSunshineStats) {
  const { sw, ne } = seg.boundingBox;
  return {
    south: Math.min(sw.latitude, ne.latitude),
    north: Math.max(sw.latitude, ne.latitude),
    west: Math.min(sw.longitude, ne.longitude),
    east: Math.max(sw.longitude, ne.longitude),
  };
}

/** Axis-aligned lat/lng rectangles intersect (no dateline handling). */
export function regionIntersectsSegmentBBox(
  region: SolarMapRegionBounds,
  seg: RoofSegmentSizeAndSunshineStats
): boolean {
  const b = normalizeSegmentBBox(seg);
  const r = {
    south: Math.min(region.south, region.north),
    north: Math.max(region.south, region.north),
    west: Math.min(region.west, region.east),
    east: Math.max(region.west, region.east),
  };
  return !(r.north < b.south || r.south > b.north || r.east < b.west || r.west > b.east);
}

function mergeSunshineQuantilesWeighted(segments: RoofSegmentSizeAndSunshineStats[]): number[] {
  if (segments.length === 0) return [];
  const template = segments[0].stats.sunshineQuantiles;
  const len = template.length;
  const totalArea = segments.reduce((s, x) => s + x.stats.areaMeters2, 0);
  if (totalArea <= 0) return [...template];
  const out = new Array(len).fill(0);
  for (const seg of segments) {
    const w = seg.stats.areaMeters2 / totalArea;
    const q = seg.stats.sunshineQuantiles;
    for (let i = 0; i < len; i++) {
      out[i] += (q[i] ?? q[q.length - 1] ?? 0) * w;
    }
  }
  return out;
}

/**
 * Restrict Building Insights to roof segments (and derived solar data) that intersect
 * the user's drawn rectangle. The API always returns the whole building; this is a
 * client-side clip for UX and sizing.
 */
export function filterBuildingInsightsToRegion(
  insights: BuildingInsights,
  region: SolarMapRegionBounds | null
): BuildingInsights {
  if (!region) return insights;

  const sp = insights.solarPotential;
  const segments = sp.roofSegmentStats;
  const filtered: RoofSegmentSizeAndSunshineStats[] = [];
  const origIndexOfFiltered: number[] = [];

  segments.forEach((seg, i) => {
    if (regionIntersectsSegmentBBox(region, seg)) {
      filtered.push(seg);
      origIndexOfFiltered.push(i);
    }
  });

  const oldToNew = new Map<number, number>();
  origIndexOfFiltered.forEach((oldIdx, newIdx) => oldToNew.set(oldIdx, newIdx));

  const totalArea = filtered.reduce((s, seg) => s + seg.stats.areaMeters2, 0);
  const totalGround = filtered.reduce((s, seg) => s + seg.stats.groundAreaMeters2, 0);
  const mergedQuantiles = mergeSunshineQuantilesWeighted(filtered);
  const maxSun =
    filtered.length === 0
      ? 0
      : Math.max(
          ...filtered.flatMap((s) => s.stats.sunshineQuantiles),
          0
        );

  const origWhole = sp.wholeRoofStats.areaMeters2;
  const areaRatio = origWhole > 0 ? Math.min(1, totalArea / origWhole) : 0;
  const footprint = Math.max(0.01, (sp.panelWidthMeters || 1) * (sp.panelHeightMeters || 1.7));
  const panelsFromArea = Math.floor(totalArea / footprint);

  const filteredPanels: SolarPanel[] = (sp.solarPanels ?? []).filter((p) => oldToNew.has(p.segmentIndex)).map((p) => ({
    ...p,
    segmentIndex: oldToNew.get(p.segmentIndex)!,
  }));

  const filterConfigs = (configs: SolarPanelConfig[]): SolarPanelConfig[] =>
    configs.map((c) => ({
      ...c,
      roofSegmentSummaries: c.roofSegmentSummaries
        .filter((s) => oldToNew.has(s.segmentIndex))
        .map((s) => ({
          ...s,
          segmentIndex: oldToNew.get(s.segmentIndex)!,
        })),
    }));

  const newSp = {
    ...sp,
    roofSegmentStats: filtered,
    solarPanels: filteredPanels,
    solarPanelConfigs: filterConfigs(sp.solarPanelConfigs ?? []),
    wholeRoofStats: {
      ...sp.wholeRoofStats,
      areaMeters2: totalArea,
      groundAreaMeters2: totalGround,
      sunshineQuantiles:
        filtered.length === 0 ? [] : mergedQuantiles.length ? mergedQuantiles : sp.wholeRoofStats.sunshineQuantiles,
    },
    buildingStats: {
      ...sp.buildingStats,
      areaMeters2: totalArea,
      groundAreaMeters2: totalGround,
      sunshineQuantiles:
        filtered.length === 0 ? [] : mergedQuantiles.length ? mergedQuantiles : sp.buildingStats.sunshineQuantiles,
    },
    maxSunshineHoursPerYear: filtered.length === 0 ? 0 : maxSun,
    maxArrayAreaMeters2: Math.min(sp.maxArrayAreaMeters2, totalArea),
    maxArrayPanelsCount: Math.max(
      0,
      Math.min(Math.floor(sp.maxArrayPanelsCount * areaRatio), panelsFromArea)
    ),
  };

  return {
    ...insights,
    solarPotential: newSp,
  };
}

export function pointInsideRegion(lat: number, lng: number, region: SolarMapRegionBounds): boolean {
  const r = {
    south: Math.min(region.south, region.north),
    north: Math.max(region.south, region.north),
    west: Math.min(region.west, region.east),
    east: Math.max(region.west, region.east),
  };
  return lat >= r.south && lat <= r.north && lng >= r.west && lng <= r.east;
}
