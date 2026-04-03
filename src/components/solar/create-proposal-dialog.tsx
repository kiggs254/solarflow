"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLeads, createLead } from "@/hooks/use-leads";
import { useLeadStages } from "@/hooks/use-workflows";
import { createProposal } from "@/hooks/use-proposals";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { BuildingInsights } from "@/types/solar";
import type { NormalizedSolarData } from "@/types/solar-providers";
import type { DesignCompletePayload } from "./system-designer";
import type { RegionBounds } from "./solar-map";

interface CreateProposalDialogProps {
  open: boolean;
  onClose: () => void;
  insights: BuildingInsights | null;
  normalized: NormalizedSolarData | null;
  design: DesignCompletePayload;
  leadAddress: string;
  latitude: number;
  longitude: number;
  mapSnapshotBase64: string | null;
  regionBounds: RegionBounds | null;
  /** When set (e.g. from /solar?leadId=), pre-fill “Existing lead” */
  preselectedLeadId?: string | null;
  onCreated: () => void;
}

export function CreateProposalDialog({
  open,
  onClose,
  insights,
  normalized,
  design,
  leadAddress,
  latitude,
  longitude,
  mapSnapshotBase64,
  regionBounds,
  preselectedLeadId,
  onCreated,
}: CreateProposalDialogProps) {
  const { leads, mutate } = useLeads();
  const { stages: leadStages } = useLeadStages();
  const [leadId, setLeadId] = useState("");
  const [title, setTitle] = useState(`Solar proposal – ${new Date().toLocaleDateString()}`);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !preselectedLeadId) return;
    setMode("existing");
    setLeadId(preselectedLeadId);
  }, [open, preselectedLeadId]);

  const sp = insights?.solarPotential ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let resolvedLeadId = leadId;
      if (mode === "new") {
        if (!newLeadName.trim()) {
          setError("Lead name is required");
          setLoading(false);
          return;
        }
        const proposalGenStageId = leadStages.find((s) => s.key === "PROPOSAL_GENERATED" && s.isActive)?.id;
        const lead = await createLead({
          name: newLeadName.trim(),
          email: newLeadEmail || undefined,
          phone: newLeadPhone || undefined,
          address: leadAddress || undefined,
          latitude,
          longitude,
          ...(proposalGenStageId ? { stageId: proposalGenStageId } : {}),
        });
        resolvedLeadId = lead.id;
        await mutate();
      } else {
        if (!resolvedLeadId) {
          setError("Select a lead");
          setLoading(false);
          return;
        }
      }

      await createProposal({
        title,
        leadId: resolvedLeadId,
        systemSizeKw: design.systemSizeKw,
        panelCount: design.panelCount,
        panelWattage: design.panelWattage,
        batteryOption: design.batteryOption,
        inverter: design.inverter,
        installCost: design.installCost,
        annualSavings: design.annualSavings,
        paybackYears: design.paybackYears,
        roiPercent: design.roi25Year,
        roofAreaSqM: sp?.wholeRoofStats.areaMeters2 ?? normalized?.roofAnalysis?.areaMeters2 ?? undefined,
        maxSunshineHours: sp?.maxSunshineHoursPerYear ?? normalized?.annualSunshineHours ?? undefined,
        solarPotentialKwh: design.yearlyProductionKwh,
        carbonOffsetKg: sp?.carbonOffsetFactorKgPerMwh ?? undefined,
        imageryQuality: insights?.imageryQuality ?? undefined,
        roofSegments: sp?.roofSegmentStats as unknown as object | undefined,
        panelConfigs: sp?.solarPanelConfigs as unknown as object | undefined,
        sunshineQuantiles: sp?.wholeRoofStats.sunshineQuantiles as unknown as object | undefined,
        solarPanelId: design.solarPanelId,
        batteryId: design.batteryId,
        inverterId: design.inverterId,
        mapSnapshotBase64: mapSnapshotBase64 ?? undefined,
        latitude,
        longitude,
        address: leadAddress || undefined,
        yearlyProductionKwh: design.yearlyProductionKwh,
        monthlyBillSavings: design.monthlyBillSavings,
        lifetimeSavings: design.lifetimeSavings,
        grossCost: design.grossCost,
        incentiveAmount: design.incentiveAmount,
        yearlyBreakdown: design.yearlyBreakdown as unknown as object,
      });

      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create proposal");
    } finally {
      setLoading(false);
    }
  };

  const leadOptions = leads.map((l) => ({ label: l.name, value: l.id }));

  return (
    <Dialog open={open} onClose={onClose} title="Create proposal from solar analysis">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <Input id="title" label="Proposal title" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <div className="flex gap-2">
          <Button type="button" variant={mode === "existing" ? "default" : "outline"} size="sm" onClick={() => setMode("existing")}>
            Existing lead
          </Button>
          <Button type="button" variant={mode === "new" ? "default" : "outline"} size="sm" onClick={() => setMode("new")}>
            New lead
          </Button>
        </div>

        {mode === "existing" ? (
          <Select
            id="leadId"
            label="Lead"
            options={leadOptions}
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            placeholder="Select lead..."
          />
        ) : (
          <div className="space-y-2">
            <Input id="nlName" label="Lead name" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} required />
            <Input id="nlEmail" label="Email" type="email" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} />
            <Input id="nlPhone" label="Phone" value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} />
          </div>
        )}

        {mapSnapshotBase64 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Map snapshot</p>
            <img src={mapSnapshotBase64} alt="Map" className="w-full max-h-40 object-cover rounded-lg border border-border" />
          </div>
        )}

        {regionBounds && (
          <p className="text-xs text-muted-foreground">
            Region: N {regionBounds.north.toFixed(5)} S {regionBounds.south.toFixed(5)} E {regionBounds.east.toFixed(5)} W{" "}
            {regionBounds.west.toFixed(5)}
          </p>
        )}

        <div className="rounded-lg border border-border bg-muted p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground">Analysis summary</p>
          <p>
            {sp ? `Roof area: ${formatNumber(sp.wholeRoofStats.areaMeters2)} m² | ` : ""}
            Sunshine: {formatNumber((sp?.maxSunshineHoursPerYear ?? normalized?.annualSunshineHours ?? 0), 0)} h/yr
          </p>
          {sp && insights && (
            <p>Imagery: {insights.imageryQuality} | Carbon factor: {formatNumber(sp.carbonOffsetFactorKgPerMwh, 0)} kg CO₂/MWh</p>
          )}
          {insights && (
            <p>Building: {insights.name} | {insights.postalCode} {insights.administrativeArea}</p>
          )}
          {!insights && normalized && (
            <p>Data source: {normalized.dataSource} · Coverage: {normalized.coverageQuality}</p>
          )}
        </div>

        <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-xs text-brand-950 space-y-1 dark:border-brand-900/40 dark:bg-brand-950/25 dark:text-brand-100">
          <p className="font-semibold text-brand-900 dark:text-brand-200">Design</p>
          <p>
            {design.panelCount} × {design.panelWattage}W | {formatNumber(design.systemSizeKw)} kW |{" "}
            {formatNumber(design.yearlyProductionKwh, 0)} kWh/yr est.
          </p>
          <p>
            {design.inverter}
            {design.batteryOption ? ` | ${design.batteryOption}` : ""}
          </p>
          <p>
            Install {formatCurrency(design.installCost)} | Savings/yr {formatCurrency(design.annualSavings)} | Payback{" "}
            {design.paybackYears} yr | ROI {formatNumber(design.roi25Year)}%
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create proposal"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
