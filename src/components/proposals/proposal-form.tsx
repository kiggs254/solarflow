"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProposalStatusOption } from "@prisma/client";

interface ProposalFormProps {
  statuses: ProposalStatusOption[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  leads?: { id: string; name: string }[];
}

export function ProposalForm({
  statuses,
  initialData,
  onSubmit,
  onCancel,
  loading,
  leads = [],
}: ProposalFormProps) {
  const activeStatuses = useMemo(
    () =>
      [...statuses]
        .filter((s) => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [statuses]
  );

  const [form, setForm] = useState({
    title: initialData?.title ?? "",
    leadId: initialData?.leadId ?? "",
    projectId: initialData?.projectId ?? "",
    statusId: initialData?.statusId ?? "",
    systemSizeKw: initialData?.systemSizeKw ?? "",
    panelCount: initialData?.panelCount ?? "",
    panelWattage: initialData?.panelWattage ?? "400",
    batteryOption: initialData?.batteryOption ?? "",
    inverter: initialData?.inverter ?? "",
    installCost: initialData?.installCost ?? "",
    annualSavings: initialData?.annualSavings ?? "",
    paybackYears: initialData?.paybackYears ?? "",
    roiPercent: initialData?.roiPercent ?? "",
  });

  const resolvedStatusId = form.statusId || activeStatuses[0]?.id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...form,
      statusId: resolvedStatusId || undefined,
      systemSizeKw: parseFloat(form.systemSizeKw),
      panelCount: parseInt(form.panelCount),
      panelWattage: parseInt(form.panelWattage),
      installCost: parseFloat(form.installCost),
      annualSavings: parseFloat(form.annualSavings),
      paybackYears: parseFloat(form.paybackYears),
      roiPercent: parseFloat(form.roiPercent),
      batteryOption: form.batteryOption || null,
      inverter: form.inverter || null,
      projectId: form.projectId || null,
    });
  };

  const statusOptions = activeStatuses.map((s) => ({ label: s.label, value: s.id }));

  if (activeStatuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No proposal statuses configured. Ask an admin to add them in Settings.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="title"
        label="Proposal Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        required
        placeholder="Solar Installation Proposal"
      />
      {leads.length > 0 && (
        <Select
          id="leadId"
          label="Lead"
          options={leads.map((l) => ({ label: l.name, value: l.id }))}
          value={form.leadId}
          onChange={(e) => setForm({ ...form, leadId: e.target.value })}
          placeholder="Select a lead..."
        />
      )}
      <Select
        id="statusId"
        label="Status"
        options={statusOptions}
        value={resolvedStatusId}
        onChange={(e) => setForm({ ...form, statusId: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="systemSizeKw"
          label="System Size (kW)"
          type="number"
          step="0.1"
          value={form.systemSizeKw}
          onChange={(e) => setForm({ ...form, systemSizeKw: e.target.value })}
          required
        />
        <Input
          id="panelCount"
          label="Panel Count"
          type="number"
          value={form.panelCount}
          onChange={(e) => setForm({ ...form, panelCount: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="panelWattage"
          label="Panel Wattage"
          type="number"
          value={form.panelWattage}
          onChange={(e) => setForm({ ...form, panelWattage: e.target.value })}
          required
        />
        <Input
          id="installCost"
          label="Install Cost ($)"
          type="number"
          step="0.01"
          value={form.installCost}
          onChange={(e) => setForm({ ...form, installCost: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="annualSavings"
          label="Annual Savings ($)"
          type="number"
          step="0.01"
          value={form.annualSavings}
          onChange={(e) => setForm({ ...form, annualSavings: e.target.value })}
          required
        />
        <Input
          id="paybackYears"
          label="Payback (years)"
          type="number"
          step="0.1"
          value={form.paybackYears}
          onChange={(e) => setForm({ ...form, paybackYears: e.target.value })}
          required
        />
      </div>
      <Input
        id="roiPercent"
        label="ROI (%)"
        type="number"
        step="0.1"
        value={form.roiPercent}
        onChange={(e) => setForm({ ...form, roiPercent: e.target.value })}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="batteryOption"
          label="Battery (optional)"
          value={form.batteryOption}
          onChange={(e) => setForm({ ...form, batteryOption: e.target.value })}
          placeholder="e.g. Tesla Powerwall"
        />
        <Input
          id="inverter"
          label="Inverter (optional)"
          value={form.inverter}
          onChange={(e) => setForm({ ...form, inverter: e.target.value })}
          placeholder="e.g. Microinverters"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update" : "Create Proposal"}
        </Button>
      </div>
    </form>
  );
}
