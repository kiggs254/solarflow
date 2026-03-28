"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Battery } from "@prisma/client";

interface BatteryFormProps {
  initial?: Partial<Battery>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function BatteryForm({ initial, onSubmit, onCancel, loading }: BatteryFormProps) {
  const [form, setForm] = useState({
    manufacturer: initial?.manufacturer ?? "",
    model: initial?.model ?? "",
    capacityKwh: String(initial?.capacityKwh ?? "13.5"),
    usableKwh: String(initial?.usableKwh ?? "13.5"),
    powerKw: String(initial?.powerKw ?? "5"),
    peakPowerKw: String(initial?.peakPowerKw ?? "7"),
    voltage: String(initial?.voltage ?? "240"),
    cycleLife: String(initial?.cycleLife ?? "6000"),
    warrantyYears: String(initial?.warrantyYears ?? "10"),
    roundTripEff: String(initial?.roundTripEff ?? "0.9"),
    weightKg: String(initial?.weightKg ?? "100"),
    cost: String(initial?.cost ?? "9000"),
    isActive: initial?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      manufacturer: form.manufacturer,
      model: form.model,
      capacityKwh: parseFloat(form.capacityKwh),
      usableKwh: parseFloat(form.usableKwh),
      powerKw: parseFloat(form.powerKw),
      peakPowerKw: parseFloat(form.peakPowerKw),
      voltage: parseFloat(form.voltage),
      cycleLife: parseInt(form.cycleLife, 10),
      warrantyYears: parseInt(form.warrantyYears, 10),
      roundTripEff: parseFloat(form.roundTripEff),
      weightKg: parseFloat(form.weightKg),
      cost: parseFloat(form.cost),
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
        <Input id="cap" label="Capacity (kWh)" step="0.01" value={form.capacityKwh} onChange={(e) => setForm({ ...form, capacityKwh: e.target.value })} required />
        <Input id="use" label="Usable (kWh)" step="0.01" value={form.usableKwh} onChange={(e) => setForm({ ...form, usableKwh: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="pw" label="Power (kW)" step="0.01" value={form.powerKw} onChange={(e) => setForm({ ...form, powerKw: e.target.value })} required />
        <Input id="ppw" label="Peak power (kW)" step="0.01" value={form.peakPowerKw} onChange={(e) => setForm({ ...form, peakPowerKw: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="v" label="Voltage (V)" step="0.1" value={form.voltage} onChange={(e) => setForm({ ...form, voltage: e.target.value })} required />
        <Input id="cyc" label="Cycle life" type="number" value={form.cycleLife} onChange={(e) => setForm({ ...form, cycleLife: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="war" label="Warranty (years)" type="number" value={form.warrantyYears} onChange={(e) => setForm({ ...form, warrantyYears: e.target.value })} required />
        <Input id="rte" label="Round-trip eff." step="0.01" value={form.roundTripEff} onChange={(e) => setForm({ ...form, roundTripEff: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="wt" label="Weight (kg)" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required />
        <Input id="cost" label="Cost ($)" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
      </div>
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
