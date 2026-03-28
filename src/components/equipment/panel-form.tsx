"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SolarPanel } from "@prisma/client";

interface PanelFormProps {
  initial?: Partial<SolarPanel>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function PanelForm({ initial, onSubmit, onCancel, loading }: PanelFormProps) {
  const [form, setForm] = useState({
    manufacturer: initial?.manufacturer ?? "",
    model: initial?.model ?? "",
    wattage: String(initial?.wattage ?? ""),
    efficiency: String(initial?.efficiency ?? "0.21"),
    areaSqM: String(initial?.areaSqM ?? "1.9"),
    weightKg: String(initial?.weightKg ?? "22"),
    warrantyYears: String(initial?.warrantyYears ?? "25"),
    temperatureCoef: String(initial?.temperatureCoef ?? "-0.0034"),
    voltageVmp: String(initial?.voltageVmp ?? "40"),
    currentImp: String(initial?.currentImp ?? "10"),
    costPerPanel: String(initial?.costPerPanel ?? "200"),
    isActive: initial?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      manufacturer: form.manufacturer,
      model: form.model,
      wattage: parseInt(form.wattage, 10),
      efficiency: parseFloat(form.efficiency),
      areaSqM: parseFloat(form.areaSqM),
      weightKg: parseFloat(form.weightKg),
      warrantyYears: parseInt(form.warrantyYears, 10),
      temperatureCoef: parseFloat(form.temperatureCoef),
      voltageVmp: parseFloat(form.voltageVmp),
      currentImp: parseFloat(form.currentImp),
      costPerPanel: parseFloat(form.costPerPanel),
      isActive: form.isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <Input id="mfg" label="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} required />
        <Input id="model" label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="watt" label="Wattage (W)" type="number" value={form.wattage} onChange={(e) => setForm({ ...form, wattage: e.target.value })} required />
        <Input id="eff" label="Efficiency (0-1)" step="0.001" value={form.efficiency} onChange={(e) => setForm({ ...form, efficiency: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="area" label="Area (m²)" step="0.01" value={form.areaSqM} onChange={(e) => setForm({ ...form, areaSqM: e.target.value })} required />
        <Input id="wt" label="Weight (kg)" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="war" label="Warranty (years)" type="number" value={form.warrantyYears} onChange={(e) => setForm({ ...form, warrantyYears: e.target.value })} required />
        <Input id="tc" label="Temp coef (%/°C)" step="0.0001" value={form.temperatureCoef} onChange={(e) => setForm({ ...form, temperatureCoef: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="vmp" label="Vmp (V)" step="0.1" value={form.voltageVmp} onChange={(e) => setForm({ ...form, voltageVmp: e.target.value })} required />
        <Input id="imp" label="Imp (A)" step="0.01" value={form.currentImp} onChange={(e) => setForm({ ...form, currentImp: e.target.value })} required />
      </div>
      <Input id="cost" label="Cost per panel ($)" step="0.01" value={form.costPerPanel} onChange={(e) => setForm({ ...form, costPerPanel: e.target.value })} required />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        Active
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}
