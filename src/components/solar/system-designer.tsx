"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { calculateSystemDesign, PANEL_OPTIONS, BATTERY_OPTIONS, INVERTER_OPTIONS, DEFAULT_EFFICIENCY } from "@/lib/system-design";
import { calculateFinancials, DEFAULT_COST_PER_WATT, DEFAULT_ELECTRICITY_RATE, DEFAULT_INCENTIVE_PERCENT } from "@/lib/financial";
import { formatNumber, formatCurrency } from "@/lib/utils";
import type { BuildingInsights } from "@/types/solar";
import type { NormalizedSolarData } from "@/types/solar-providers";
import { Zap, Calculator, PenLine } from "lucide-react";
import { usePanels, useBatteries, useInverters } from "@/hooks/use-equipment";
import type { SolarPanel, Battery, Inverter } from "@prisma/client";
import { PageLoading } from "@/components/ui/loading";

export interface DesignCompletePayload {
  panelCount: number;
  systemSizeKw: number;
  yearlyProductionKwh: number;
  grossCost: number;
  installCost: number;
  incentiveAmount: number;
  annualSavings: number;
  paybackYears: number;
  roi25Year: number;
  monthlyBillSavings: number;
  lifetimeSavings: number;
  yearlyBreakdown: { year: number; cumulativeSavings: number; netPosition: number }[];
  panelWattage: number;
  batteryOption: string | null;
  inverter: string;
  solarPanelId: string | null;
  batteryId: string | null;
  inverterId: string | null;
}

interface SystemDesignerProps {
  insights?: BuildingInsights;
  normalized?: NormalizedSolarData;
  /** When the user draws a polygon, pass the usable area (m²) here to override roof-analysis area. */
  roofAreaOverrideSqM?: number;
  /** Short description shown on the override badge (e.g. "128.4 m² drawn · 75% usable"). */
  drawnAreaLabel?: string;
  onDesignComplete?: (design: DesignCompletePayload) => void;
}

function inverterEfficiencyBonus(efficiency: number): number {
  return Math.min(0.08, Math.max(0, (efficiency - 0.96) * 1.5));
}

export function SystemDesigner({
  insights,
  normalized,
  roofAreaOverrideSqM,
  drawnAreaLabel,
  onDesignComplete,
}: SystemDesignerProps) {
  const { panels: dbPanels, isLoading: lp } = usePanels(true);
  const { batteries: dbBatteries, isLoading: lb } = useBatteries(true);
  const { inverters: dbInverters, isLoading: li } = useInverters(true);

  const [panelKey, setPanelKey] = useState("0");
  const [batteryKey, setBatteryKey] = useState("none");
  const [inverterKey, setInverterKey] = useState("0");

  useEffect(() => {
    if (dbPanels.length && !dbPanels.some((p) => p.id === panelKey)) {
      setPanelKey(dbPanels[0].id);
    }
    if (dbInverters.length && !dbInverters.some((i) => i.id === inverterKey)) {
      setInverterKey(dbInverters[0].id);
    }
  }, [dbPanels, dbInverters, panelKey, inverterKey]);

  const useDb = dbPanels.length > 0 && dbInverters.length > 0;

  const sp = insights?.solarPotential;
  // Prefer Google's precise value; fall back to normalized annual hours from other providers
  const sunHoursPerDay = sp
    ? sp.maxSunshineHoursPerYear / 365
    : (normalized?.annualSunshineHours ?? 1800) / 365;
  // Roof area: prefer the user's drawn area (overrides Google's whole-roof total when present).
  const roofAreaSqM =
    roofAreaOverrideSqM ?? sp?.wholeRoofStats.areaMeters2 ?? normalized?.roofAnalysis?.areaMeters2 ?? 50;

  const { panel, battery, inverter, efficiency } = useMemo(() => {
    if (useDb) {
      const p = dbPanels.find((x) => x.id === panelKey) ?? dbPanels[0];
      const inv = dbInverters.find((x) => x.id === inverterKey) ?? dbInverters[0];
      const b =
        batteryKey === "none"
          ? null
          : dbBatteries.find((x) => x.id === batteryKey) ?? null;
      const eff = DEFAULT_EFFICIENCY + (inv ? inverterEfficiencyBonus(inv.efficiency) : 0);
      return {
        panel: p,
        battery: b,
        inverter: inv,
        efficiency: eff,
      };
    }
    const pIdx = Math.min(parseInt(panelKey, 10) || 0, PANEL_OPTIONS.length - 1);
    const bIdx = Math.min(parseInt(batteryKey, 10) || 0, BATTERY_OPTIONS.length - 1);
    const iIdx = Math.min(parseInt(inverterKey, 10) || 0, INVERTER_OPTIONS.length - 1);
    const po = PANEL_OPTIONS[pIdx];
    const bo = BATTERY_OPTIONS[bIdx];
    const io = INVERTER_OPTIONS[iIdx];
    return {
      panel: po,
      battery: bo,
      inverter: io,
      efficiency: DEFAULT_EFFICIENCY + io.efficiencyBonus,
    };
  }, [useDb, dbPanels, dbBatteries, dbInverters, panelKey, batteryKey, inverterKey]);

  const design = useMemo(() => {
    if (!panel) {
      return { panelCount: 0, systemSizeKw: 0, yearlyProductionKwh: 0 };
    }
    const wattage = "wattage" in panel && typeof panel.wattage === "number" ? panel.wattage : (panel as { wattage: number }).wattage;
    const areaSqM = "areaSqM" in panel && typeof (panel as SolarPanel).areaSqM === "number" ? (panel as SolarPanel).areaSqM : (panel as { areaSqM: number }).areaSqM;
    return calculateSystemDesign({
      roofAreaSqM,
      panelWattage: wattage,
      panelAreaSqM: areaSqM,
      sunHoursPerDay,
      efficiency,
    });
  }, [panel, roofAreaSqM, sunHoursPerDay, efficiency]);

  const financials = useMemo(() => {
    let batteryCost = 0;
    let equipmentCost = 0;
    if (useDb && panel && "id" in panel) {
      const p = panel as SolarPanel;
      const inv = inverter as Inverter;
      batteryCost = battery && "cost" in battery ? (battery as Battery).cost : 0;
      equipmentCost = design.panelCount * p.costPerPanel + inv.cost;
    } else {
      const bo = battery as (typeof BATTERY_OPTIONS)[0] | null;
      batteryCost = bo?.cost ?? 0;
      equipmentCost = 0;
    }
    return calculateFinancials({
      systemSizeKw: design.systemSizeKw,
      costPerWatt: DEFAULT_COST_PER_WATT,
      electricityRate: DEFAULT_ELECTRICITY_RATE,
      yearlyProductionKwh: design.yearlyProductionKwh,
      incentivePercent: DEFAULT_INCENTIVE_PERCENT,
      batteryCost,
      equipmentCost: useDb ? equipmentCost : 0,
    });
  }, [useDb, panel, battery, inverter, design, batteryKey]);

  if (lp || li) return <PageLoading />;

  const panelSelectOptions = useDb
    ? dbPanels.map((p) => ({ label: `${p.manufacturer} ${p.model} (${p.wattage}W)`, value: p.id }))
    : PANEL_OPTIONS.map((p, i) => ({ label: p.label, value: String(i) }));

  const batterySelectOptions = useDb
    ? [{ label: "None", value: "none" }, ...dbBatteries.map((b) => ({ label: `${b.manufacturer} ${b.model} (${b.capacityKwh} kWh)`, value: b.id }))]
    : BATTERY_OPTIONS.map((b, i) => ({ label: b.label, value: String(i) }));

  const inverterSelectOptions = useDb
    ? dbInverters.map((inv) => ({ label: `${inv.manufacturer} ${inv.model} (${inv.type})`, value: inv.id }))
    : INVERTER_OPTIONS.map((inv, i) => ({ label: inv.label, value: String(i) }));

  const handleComplete = () => {
    if (!onDesignComplete || !panel) return;
    const wattage = useDb ? (panel as SolarPanel).wattage : (panel as { wattage: number }).wattage;
    let batteryLabel: string | null = null;
    if (useDb && battery && "manufacturer" in battery) {
      batteryLabel = `${(battery as Battery).manufacturer} ${(battery as Battery).model}`;
    } else if (!useDb) {
      const bo = battery as (typeof BATTERY_OPTIONS)[0] | undefined;
      if (bo && bo.value !== "none") batteryLabel = bo.label;
    }
    const inverterLabel = useDb
      ? `${(inverter as Inverter).manufacturer} ${(inverter as Inverter).model}`
      : (inverter as { label: string }).label;

    onDesignComplete({
      ...design,
      ...financials,
      panelWattage: wattage,
      batteryOption: batteryLabel,
      inverter: inverterLabel,
      solarPanelId: useDb && "id" in panel ? (panel as SolarPanel).id : null,
      batteryId: useDb && battery && "id" in battery ? (battery as Battery).id : null,
      inverterId: useDb && inverter && "id" in inverter ? (inverter as Inverter).id : null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-brand-500" />
          System Designer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sp && normalized && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            Roof area estimated at 50 m² (no rooftop data from {normalized.dataSource}). Google Solar API provides precise measurements.
          </div>
        )}
        <Select
          id="panel"
          label="Solar Panel"
          options={panelSelectOptions}
          value={
            useDb
              ? panelKey
              : String(Math.min(parseInt(panelKey, 10) || 0, PANEL_OPTIONS.length - 1))
          }
          onChange={(e) => setPanelKey(e.target.value)}
        />
        <Select
          id="battery"
          label="Battery Storage"
          options={batterySelectOptions}
          value={batteryKey}
          onChange={(e) => setBatteryKey(e.target.value)}
        />
        <Select
          id="inverter"
          label="Inverter"
          options={inverterSelectOptions}
          value={
            useDb
              ? inverterKey
              : String(Math.min(parseInt(inverterKey, 10) || 0, INVERTER_OPTIONS.length - 1))
          }
          onChange={(e) => setInverterKey(e.target.value)}
        />

        {roofAreaOverrideSqM != null && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            <PenLine className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold">Using drawn area: {formatNumber(roofAreaOverrideSqM, 1)} m²</p>
              {drawnAreaLabel && <p className="text-amber-800/80 dark:text-amber-300/80">{drawnAreaLabel}</p>}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">System Specs</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Panels</p>
              <p className="text-lg font-bold text-foreground">{design.panelCount}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">System Size</p>
              <p className="text-lg font-bold text-foreground">{formatNumber(design.systemSizeKw)} kW</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Yearly Production</p>
              <p className="text-lg font-bold text-foreground">{formatNumber(design.yearlyProductionKwh, 0)} kWh</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Financial Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Install Cost</p>
              <p className="text-lg font-bold text-emerald-900">{formatCurrency(financials.installCost)}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Annual Savings</p>
              <p className="text-lg font-bold text-emerald-900">{formatCurrency(financials.annualSavings)}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Payback Period</p>
              <p className="text-lg font-bold text-emerald-900">{financials.paybackYears} yrs</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">25-Year ROI</p>
              <p className="text-lg font-bold text-emerald-900">{formatNumber(financials.roi25Year)}%</p>
            </div>
          </div>
        </div>

        {onDesignComplete && (
          <Button className="w-full" onClick={handleComplete}>
            <Zap className="mr-1.5 h-4 w-4" />
            Create Proposal from Design
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
