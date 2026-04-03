"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { BuildingInsights } from "@/types/solar";
import type { NormalizedSolarData, SolarProviderName } from "@/types/solar-providers";
import { Sun, Ruler, Layers, Zap, BarChart3, Database } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PROVIDER_LABELS: Record<SolarProviderName, string> = {
  GOOGLE: "Google Solar API",
  PVGIS: "PVGIS (EU JRC)",
  NREL: "NREL PVWatts v8",
  NASA: "NASA POWER",
  OPEN_METEO: "Open-Meteo Solar",
};

const QUALITY_COLORS: Record<string, string> = {
  HIGH: "text-emerald-700 bg-emerald-50 border-emerald-200",
  MEDIUM: "text-amber-700 bg-amber-50 border-amber-200",
  LOW: "text-orange-700 bg-orange-50 border-orange-200",
};

interface BuildingInsightsPanelProps {
  /** Raw Google BuildingInsights — defined only when provider === 'GOOGLE' */
  insights?: BuildingInsights;
  normalized?: NormalizedSolarData;
  provider?: SolarProviderName;
}

export function BuildingInsightsPanel({ insights, normalized, provider }: BuildingInsightsPanelProps) {
  const sp = insights?.solarPotential;
  const roofAnalysis = normalized?.roofAnalysis;

  const metrics = roofAnalysis
    ? [
        {
          icon: Ruler,
          label: "Roof Area",
          value: `${formatNumber(roofAnalysis.areaMeters2)} m²`,
          color: "text-blue-600 bg-blue-50",
        },
        {
          icon: Sun,
          label: "Max Sunshine",
          value: `${formatNumber(roofAnalysis.maxSunshineHoursPerYear, 0)} hrs/yr`,
          color: "text-brand-600 bg-brand-50",
        },
        {
          icon: Layers,
          label: "Max Panels",
          value: `${roofAnalysis.maxArrayPanelsCount}`,
          color: "text-purple-600 bg-purple-50",
        },
        {
          icon: Zap,
          label: "Panel Capacity",
          value: `${roofAnalysis.panelCapacityWatts}W`,
          color: "text-emerald-600 bg-emerald-50",
        },
      ]
    : [
        {
          icon: Sun,
          label: "Annual Sunshine",
          value: normalized ? `${formatNumber(normalized.annualSunshineHours, 0)} hrs/yr` : "—",
          color: "text-brand-600 bg-brand-50",
        },
        {
          icon: Zap,
          label: "Irradiance",
          value: normalized ? `${formatNumber(normalized.annualIrradiance, 0)} kWh/m²/yr` : "—",
          color: "text-emerald-600 bg-emerald-50",
        },
        {
          icon: BarChart3,
          label: "Est. Output (4kWp)",
          value: normalized ? `${formatNumber(normalized.annualEnergyOutputKwh, 0)} kWh/yr` : "—",
          color: "text-purple-600 bg-purple-50",
        },
        {
          icon: Ruler,
          label: "Optimal Tilt",
          value: normalized ? `${formatNumber(normalized.optimalTilt, 0)}°` : "—",
          color: "text-blue-600 bg-blue-50",
        },
      ];

  const monthlyData =
    normalized?.monthlyBreakdown?.length === 12
      ? MONTH_LABELS.map((month, i) => ({ month, kWh: normalized.monthlyBreakdown[i] }))
      : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Building Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {/* Roof segments — Google only */}
        {roofAnalysis && sp && sp.roofSegmentStats.length > 0 && (
          <div>
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

        {/* Banner when no roof analysis */}
        {!roofAnalysis && provider && provider !== "GOOGLE" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            Roof segment analysis unavailable with {PROVIDER_LABELS[provider]}. Configure Google Solar API in{" "}
            <strong>Settings → Solar APIs</strong> for detailed rooftop modeling.
          </div>
        )}

        {/* Monthly breakdown chart */}
        {monthlyData.length === 12 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Monthly Energy Output (est.)</h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v) => [`${v} kWh`, "Est. output"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="kWh" radius={[3, 3, 0, 0]}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={i >= 4 && i <= 8 ? "#f59e0b" : "#fcd34d"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Footer: Google carbon/imagery OR provider badge */}
        {roofAnalysis && sp ? (
          <div className="rounded-lg bg-brand-50 border border-brand-100 p-3">
            <p className="text-xs text-brand-800">
              <strong>Carbon Offset:</strong> {formatNumber(sp.carbonOffsetFactorKgPerMwh, 0)} kg CO₂/MWh
            </p>
            <p className="text-xs text-brand-800 mt-1">
              <strong>Imagery Quality:</strong> {insights?.imageryQuality}
            </p>
          </div>
        ) : normalized ? (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${QUALITY_COLORS[normalized.coverageQuality] ?? ""}`}>
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Source:</strong> {provider ? PROVIDER_LABELS[provider] : "Unknown"} ·{" "}
              <strong>Coverage:</strong> {normalized.coverageQuality}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
