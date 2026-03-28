"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { BuildingInsights } from "@/types/solar";
import { Sun, Ruler, Layers, Zap } from "lucide-react";

interface BuildingInsightsPanelProps {
  insights: BuildingInsights;
}

export function BuildingInsightsPanel({ insights }: BuildingInsightsPanelProps) {
  const sp = insights.solarPotential;

  const metrics = [
    {
      icon: Ruler,
      label: "Roof Area",
      value: `${formatNumber(sp.wholeRoofStats.areaMeters2)} m²`,
      color: "text-blue-600 bg-blue-50",
    },
    {
      icon: Sun,
      label: "Max Sunshine",
      value: `${formatNumber(sp.maxSunshineHoursPerYear, 0)} hrs/yr`,
      color: "text-brand-600 bg-brand-50",
    },
    {
      icon: Layers,
      label: "Max Panels",
      value: `${sp.maxArrayPanelsCount}`,
      color: "text-purple-600 bg-purple-50",
    },
    {
      icon: Zap,
      label: "Panel Capacity",
      value: `${sp.panelCapacityWatts}W`,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Building Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-border p-3">
              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${m.color} mb-2`}>
                <m.icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-lg font-bold text-foreground font-[family-name:var(--font-geist-mono)]">{m.value}</p>
            </div>
          ))}
        </div>

        {sp.roofSegmentStats.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Roof Segments</h4>
            <div className="space-y-2">
              {sp.roofSegmentStats.map((seg, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    Segment {i + 1} ({seg.azimuthDegrees}° / {seg.pitchDegrees}° pitch)
                  </span>
                  <span className="font-medium text-foreground">
                    {formatNumber(seg.stats.areaMeters2)} m²
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg bg-brand-50 border border-brand-100 p-3">
          <p className="text-xs text-brand-800">
            <strong>Carbon Offset:</strong> {formatNumber(sp.carbonOffsetFactorKgPerMwh, 0)} kg CO₂/MWh
          </p>
          <p className="text-xs text-brand-800 mt-1">
            <strong>Imagery Quality:</strong> {insights.imageryQuality}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
