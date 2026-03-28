"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Inverter } from "@prisma/client";

interface InverterFormProps {
  initial?: Partial<Inverter>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function InverterForm({ initial, onSubmit, onCancel, loading }: InverterFormProps) {
  const [form, setForm] = useState({
    manufacturer: initial?.manufacturer ?? "",
    model: initial?.model ?? "",
    type: initial?.type ?? "string",
    ratedPowerKw: String(initial?.ratedPowerKw ?? "7.6"),
    maxInputVoltage: String(initial?.maxInputVoltage ?? "600"),
    efficiency: String(initial?.efficiency ?? "0.97"),
    mpptChannels: String(initial?.mpptChannels ?? "2"),
    warrantyYears: String(initial?.warrantyYears ?? "10"),
    weightKg: String(initial?.weightKg ?? "20"),
    cost: String(initial?.cost ?? "2000"),
    isActive: initial?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      manufacturer: form.manufacturer,
      model: form.model,
      type: form.type,
      ratedPowerKw: parseFloat(form.ratedPowerKw),
      maxInputVoltage: parseFloat(form.maxInputVoltage),
      efficiency: parseFloat(form.efficiency),
      mpptChannels: parseInt(form.mpptChannels, 10),
      warrantyYears: parseInt(form.warrantyYears, 10),
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
      <Input id="type" label="Type (string, micro, hybrid, string+optimizers)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
      <div className="grid grid-cols-2 gap-3">
        <Input id="rp" label="Rated power (kW)" step="0.01" value={form.ratedPowerKw} onChange={(e) => setForm({ ...form, ratedPowerKw: e.target.value })} required />
        <Input id="miv" label="Max input voltage (V)" step="0.1" value={form.maxInputVoltage} onChange={(e) => setForm({ ...form, maxInputVoltage: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="eff" label="Efficiency (0-1)" step="0.001" value={form.efficiency} onChange={(e) => setForm({ ...form, efficiency: e.target.value })} required />
        <Input id="mppt" label="MPPT channels" type="number" value={form.mpptChannels} onChange={(e) => setForm({ ...form, mpptChannels: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="war" label="Warranty (years)" type="number" value={form.warrantyYears} onChange={(e) => setForm({ ...form, warrantyYears: e.target.value })} required />
        <Input id="wt" label="Weight (kg)" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required />
      </div>
      <Input id="cost" label="Cost ($)" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
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
