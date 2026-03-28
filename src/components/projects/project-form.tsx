"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProjectStatusOption } from "@prisma/client";

interface ProjectFormProps {
  statuses: ProjectStatusOption[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  leads?: { id: string; name: string }[];
}

export function ProjectForm({
  statuses,
  initialData,
  onSubmit,
  onCancel,
  loading,
  leads = [],
}: ProjectFormProps) {
  const activeStatuses = useMemo(
    () =>
      [...statuses]
        .filter((s) => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [statuses]
  );

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    statusId: initialData?.statusId ?? "",
    leadId: initialData?.leadId ?? "",
    systemSizeKw: initialData?.systemSizeKw ?? "",
    panelCount: initialData?.panelCount ?? "",
    estimatedCost: initialData?.estimatedCost ?? "",
    annualOutput: initialData?.annualOutput ?? "",
  });

  const resolvedStatusId = form.statusId || activeStatuses[0]?.id || "";

  const statusOptions = activeStatuses.map((s) => ({ label: s.label, value: s.id }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...form,
      statusId: resolvedStatusId,
      systemSizeKw: form.systemSizeKw ? parseFloat(form.systemSizeKw) : null,
      panelCount: form.panelCount ? parseInt(form.panelCount) : null,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : null,
      annualOutput: form.annualOutput ? parseFloat(form.annualOutput) : null,
    });
  };

  if (activeStatuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No project statuses available. Ask an admin to configure them in Settings.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="name"
        label="Project Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
        placeholder="Smith Residence Solar"
      />
      {!initialData && leads.length > 0 && (
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
        />
        <Input
          id="panelCount"
          label="Panel Count"
          type="number"
          value={form.panelCount}
          onChange={(e) => setForm({ ...form, panelCount: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="estimatedCost"
          label="Estimated Cost ($)"
          type="number"
          step="0.01"
          value={form.estimatedCost}
          onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
        />
        <Input
          id="annualOutput"
          label="Annual Output (kWh)"
          type="number"
          step="0.1"
          value={form.annualOutput}
          onChange={(e) => setForm({ ...form, annualOutput: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
