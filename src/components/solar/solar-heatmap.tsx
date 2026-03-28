"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { BuildingInsights } from "@/types/solar";

interface SolarHeatmapProps {
  insights: BuildingInsights;
}

export function SolarHeatmap({ insights }: SolarHeatmapProps) {
  const sp = insights.solarPotential;
  const quantiles = sp.wholeRoofStats.sunshineQuantiles;
  const maxSunshine = Math.max(...quantiles);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solar Exposure Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Low Exposure</span>
            <span>High Exposure</span>
          </div>
          <div className="h-4 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500" />

          <div className="mt-4 space-y-2">
            {quantiles.map((q, i) => {
              const pct = maxSunshine > 0 ? (q / maxSunshine) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-8 text-xs text-muted-foreground text-right">{i + 1}</span>
                  <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, #3b82f6, #eab308 50%, #ef4444)`,
                        backgroundSize: "200% 100%",
                        backgroundPosition: `${100 - pct}% 0`,
                      }}
                    />
                  </div>
                  <span className="w-20 text-xs text-foreground font-medium text-right">
                    {q.toFixed(0)} hrs/yr
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {sp.roofSegmentStats.map((seg, i) => {
              const avgSunshine = seg.stats.sunshineQuantiles.length > 0
                ? seg.stats.sunshineQuantiles[Math.floor(seg.stats.sunshineQuantiles.length / 2)]
                : 0;
              const intensity = maxSunshine > 0 ? avgSunshine / maxSunshine : 0;

              return (
                <div
                  key={i}
                  className="rounded-lg p-3 border"
                  style={{
                    borderColor: `rgba(245, 158, 11, ${0.3 + intensity * 0.7})`,
                    backgroundColor: `rgba(245, 158, 11, ${intensity * 0.15})`,
                  }}
                >
                  <p className="text-xs font-medium text-foreground">Segment {i + 1}</p>
                  <p className="text-sm font-bold text-foreground">{avgSunshine.toFixed(0)} hrs/yr</p>
                  <p className="text-xs text-muted-foreground">{seg.azimuthDegrees}° azimuth</p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
