"use client";

import Link from "next/link";
import type { ProposalPresentationData } from "@/lib/public-proposal-dto";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import {
  Zap,
  MapPin,
  Sun,
  Leaf,
  Cpu,
  Battery,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type RoofSeg = {
  pitchDegrees?: number;
  azimuthDegrees?: number;
  stats?: { areaMeters2?: number; sunshineQuantiles?: number[] };
};

type YearRow = { year: number; cumulativeSavings: number; netPosition: number };

function parseRoofSegments(raw: unknown): RoofSeg[] {
  if (!Array.isArray(raw)) return [];
  return raw as RoofSeg[];
}

function parseYearlyBreakdown(raw: unknown): YearRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is YearRow =>
      r &&
      typeof r === "object" &&
      typeof (r as YearRow).year === "number" &&
      typeof (r as YearRow).cumulativeSavings === "number"
  );
}

function parseQuantiles(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((n): n is number => typeof n === "number");
}

type ProposalPresentationProps = {
  data: ProposalPresentationData;
  /** CRM shows full customer card with links; public shows name only */
  variant: "crm" | "public";
};

export function ProposalPresentation({ data, variant }: ProposalPresentationProps) {
  const roofSegments = parseRoofSegments(data.roofSegments);
  const yearlyData = parseYearlyBreakdown(data.yearlyBreakdown);
  const quantiles = parseQuantiles(data.sunshineQuantiles);

  const sp = data.solarPanel;
  const bat = data.battery;
  const inv = data.inverterRel;

  const mapSrc =
    data.mapSnapshotBase64 &&
    (data.mapSnapshotBase64.startsWith("data:")
      ? data.mapSnapshotBase64
      : `data:image/png;base64,${data.mapSnapshotBase64}`);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        {(data.address || data.latitude != null) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MapPin className="h-5 w-5 shrink-0 text-brand-500" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.address && <p className="text-sm text-foreground">{data.address}</p>}
              {data.latitude != null && data.longitude != null && (
                <p className="font-mono text-xs text-muted-foreground">
                  {formatNumber(data.latitude, 5)}, {formatNumber(data.longitude, 5)}
                </p>
              )}
              {mapSrc && (
                <div className="overflow-hidden rounded-lg border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mapSrc} alt="Site map snapshot" className="h-auto w-full object-cover" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(data.roofAreaSqM != null ||
          data.maxSunshineHours != null ||
          data.carbonOffsetKg != null ||
          data.imageryQuality) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sun className="h-5 w-5 shrink-0 text-brand-500" />
                Solar analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
                {data.roofAreaSqM != null && (
                  <div className="rounded-lg bg-muted p-3 text-center sm:p-4">
                    <p className="text-xs text-muted-foreground">Roof area</p>
                    <p className="text-base font-bold text-foreground sm:text-lg">
                      {formatNumber(data.roofAreaSqM)} m²
                    </p>
                  </div>
                )}
                {data.maxSunshineHours != null && (
                  <div className="rounded-lg bg-muted p-3 text-center sm:p-4">
                    <p className="text-xs text-muted-foreground">Max sunshine / yr</p>
                    <p className="text-base font-bold text-foreground sm:text-lg">
                      {formatNumber(data.maxSunshineHours)} h
                    </p>
                  </div>
                )}
                {data.solarPotentialKwh != null && (
                  <div className="rounded-lg bg-muted p-3 text-center sm:p-4">
                    <p className="text-xs text-muted-foreground">Est. production</p>
                    <p className="text-base font-bold text-foreground sm:text-lg">
                      {formatNumber(data.solarPotentialKwh)} kWh/yr
                    </p>
                  </div>
                )}
                {data.carbonOffsetKg != null && (
                  <div className="rounded-lg bg-emerald-50 p-3 text-center sm:p-4">
                    <p className="flex items-center justify-center gap-1 text-xs text-emerald-700">
                      <Leaf className="h-3 w-3" /> Carbon factor
                    </p>
                    <p className="text-base font-bold text-emerald-900 sm:text-lg">
                      {formatNumber(data.carbonOffsetKg)} kg/MWh
                    </p>
                  </div>
                )}
              </div>
              {data.imageryQuality && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Imagery quality: <span className="font-medium">{data.imageryQuality}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {roofSegments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Roof segments</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[min(100%,480px)] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Pitch°</th>
                    <th className="pb-2 pr-4 font-medium">Azimuth°</th>
                    <th className="pb-2 pr-4 font-medium">Area (m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {roofSegments.map((seg, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2 pr-4">{formatNumber(seg.pitchDegrees ?? 0, 1)}</td>
                      <td className="py-2 pr-4">{formatNumber(seg.azimuthDegrees ?? 0, 1)}</td>
                      <td className="py-2 pr-4">
                        {seg.stats?.areaMeters2 != null ? formatNumber(seg.stats.areaMeters2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {quantiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Sunshine quantiles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-28 min-h-[7rem] items-end gap-0.5 border-b border-border pb-1 sm:h-36 sm:gap-1">
                {quantiles.map((q, i) => {
                  const max = Math.max(...quantiles, 1);
                  const barPx = Math.max(6, Math.round((q / max) * 120));
                  return (
                    <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className="w-full max-w-full rounded-t bg-brand-400"
                        style={{ height: barPx }}
                        title={formatNumber(q)}
                      />
                      <span className="text-[10px] text-muted-foreground">q{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Zap className="h-5 w-5 shrink-0 text-brand-500" /> System design
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted p-3 text-center sm:p-4">
                <p className="text-xs text-muted-foreground">System size</p>
                <p className="text-lg font-bold text-foreground sm:text-xl">
                  {formatNumber(data.systemSizeKw)} kW
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center sm:p-4">
                <p className="text-xs text-muted-foreground">Panels</p>
                <p className="text-lg font-bold text-foreground sm:text-xl">{data.panelCount}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center sm:col-span-1 sm:p-4">
                <p className="text-xs text-muted-foreground">Panel wattage</p>
                <p className="text-lg font-bold text-foreground sm:text-xl">{data.panelWattage}W</p>
              </div>
              {data.yearlyProductionKwh != null && (
                <div className="rounded-lg bg-muted p-3 text-center sm:col-span-2 sm:p-4">
                  <p className="text-xs text-muted-foreground">Yearly production</p>
                  <p className="text-lg font-bold text-foreground sm:text-xl">
                    {formatNumber(data.yearlyProductionKwh)} kWh
                  </p>
                </div>
              )}
            </div>

            {sp && (
              <div className="rounded-lg border border-border p-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Cpu className="h-4 w-4 text-brand-600" /> Panel module
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Manufacturer</dt>
                    <dd className="font-medium">{sp.manufacturer}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Model</dt>
                    <dd className="font-medium">{sp.model}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Wattage</dt>
                    <dd className="font-medium">{sp.wattage}W</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Efficiency</dt>
                    <dd className="font-medium">{formatNumber(sp.efficiency * 100, 2)}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Warranty</dt>
                    <dd className="font-medium">{sp.warrantyYears} yr</dd>
                  </div>
                </dl>
              </div>
            )}

            {bat && (
              <div className="rounded-lg border border-border p-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Battery className="h-4 w-4 text-emerald-600" /> Battery
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Manufacturer</dt>
                    <dd className="font-medium">{bat.manufacturer}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Model</dt>
                    <dd className="font-medium">{bat.model}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Capacity</dt>
                    <dd className="font-medium">{formatNumber(bat.capacityKwh)} kWh</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Usable</dt>
                    <dd className="font-medium">{formatNumber(bat.usableKwh)} kWh</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Power</dt>
                    <dd className="font-medium">{formatNumber(bat.powerKw)} kW</dd>
                  </div>
                </dl>
              </div>
            )}

            {inv && (
              <div className="rounded-lg border border-border p-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Activity className="h-4 w-4 text-sky-600" /> Inverter
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Manufacturer</dt>
                    <dd className="font-medium">{inv.manufacturer}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Model</dt>
                    <dd className="font-medium">{inv.model}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium capitalize">{inv.type}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Rated power</dt>
                    <dd className="font-medium">{formatNumber(inv.ratedPowerKw)} kW</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Efficiency</dt>
                    <dd className="font-medium">{formatNumber(inv.efficiency * 100, 2)}%</dd>
                  </div>
                </dl>
              </div>
            )}

            {!sp && !bat && !inv && (data.batteryOption || data.inverter) && (
              <div className="text-sm text-muted-foreground">
                {data.batteryOption && (
                  <p>
                    <span className="text-muted-foreground">Battery (label):</span> {data.batteryOption}
                  </p>
                )}
                {data.inverter && (
                  <p>
                    <span className="text-muted-foreground">Inverter (label):</span> {data.inverter}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Financial summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {data.grossCost != null && (
                <div className="rounded-lg bg-muted p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Gross cost</p>
                  <p className="text-lg font-bold text-foreground sm:text-xl">
                    {formatCurrency(data.grossCost)}
                  </p>
                </div>
              )}
              {data.incentiveAmount != null && (
                <div className="rounded-lg bg-emerald-50 p-3 sm:p-4">
                  <p className="text-xs text-emerald-700">Incentives</p>
                  <p className="text-lg font-bold text-emerald-900 sm:text-xl">
                    {formatCurrency(data.incentiveAmount)}
                  </p>
                </div>
              )}
              <div className="rounded-lg bg-emerald-50 p-3 sm:p-4">
                <p className="text-xs text-emerald-700">Net install</p>
                <p className="text-lg font-bold text-emerald-900 sm:text-xl">
                  {formatCurrency(data.installCost)}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 sm:p-4">
                <p className="text-xs text-emerald-700">Annual savings</p>
                <p className="text-lg font-bold text-emerald-900 sm:text-xl">
                  {formatCurrency(data.annualSavings)}
                </p>
              </div>
              {data.monthlyBillSavings != null && (
                <div className="rounded-lg bg-muted p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Monthly savings</p>
                  <p className="text-lg font-bold text-foreground sm:text-xl">
                    {formatCurrency(data.monthlyBillSavings)}
                  </p>
                </div>
              )}
              {data.lifetimeSavings != null && (
                <div className="rounded-lg bg-brand-50 p-3 sm:p-4">
                  <p className="text-xs text-brand-700">25-yr lifetime savings</p>
                  <p className="text-lg font-bold text-brand-900 sm:text-xl">
                    {formatCurrency(data.lifetimeSavings)}
                  </p>
                </div>
              )}
              <div className="rounded-lg bg-brand-50 p-3 sm:p-4">
                <p className="text-xs text-brand-700">Payback</p>
                <p className="text-lg font-bold text-brand-900 sm:text-xl">{data.paybackYears} years</p>
              </div>
              <div className="rounded-lg bg-brand-50 p-3 sm:p-4">
                <p className="text-xs text-brand-700">25-year ROI</p>
                <p className="text-lg font-bold text-brand-900 sm:text-xl">
                  {formatNumber(data.roiPercent)}%
                </p>
              </div>
            </div>

            {yearlyData.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  25-year cumulative savings vs. net position
                </p>
                <div className="h-[240px] w-full min-h-0 sm:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyData} margin={{ top: 8, right: 8, left: 0, bottom: 52 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" className="opacity-60" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) =>
                          typeof value === "number" ? formatCurrency(value) : String(value ?? "")
                        }
                        labelFormatter={(y) => `Year ${y}`}
                      />
                      <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 4 }} />
                      <Line
                        type="monotone"
                        dataKey="cumulativeSavings"
                        name="Cumulative savings"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="netPosition"
                        name="Net position"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {yearlyData.length > 0 && (
              <div className="mt-6 max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left text-muted-foreground">
                      <th className="p-2 font-medium">Year</th>
                      <th className="p-2 font-medium">Cumulative savings</th>
                      <th className="p-2 font-medium">Net position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyData.map((row) => (
                      <tr key={row.year} className="border-t border-border">
                        <td className="p-2">{row.year}</td>
                        <td className="p-2">{formatCurrency(row.cumulativeSavings)}</td>
                        <td className="p-2">{formatCurrency(row.netPosition)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Name</span>
              {variant === "crm" && data.lead.id ? (
                <Link
                  href={`/leads/${data.lead.id}`}
                  className="text-right font-medium text-brand-600 hover:text-brand-700"
                >
                  {data.lead.name}
                </Link>
              ) : (
                <span className="text-right font-medium text-foreground">{data.lead.name}</span>
              )}
            </div>
            {variant === "crm" && data.lead.email && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="text-right text-foreground">{data.lead.email}</span>
              </div>
            )}
            {variant === "crm" && data.lead.phone && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-right text-foreground">{data.lead.phone}</span>
              </div>
            )}
            {variant === "crm" && data.lead.address && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Address</span>
                <span className="max-w-[200px] text-right text-foreground">{data.lead.address}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">{formatDate(data.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
