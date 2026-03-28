"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LeadFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function LeadForm({ initialData, onSubmit, onCancel, loading }: LeadFormProps) {
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    address: initialData?.address ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ ...form });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="name"
        label="Full Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
        placeholder="John Smith"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="john@example.com"
        />
        <Input
          id="phone"
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="(555) 123-4567"
        />
      </div>
      <Input
        id="address"
        label="Address"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        placeholder="123 Main St, City, State"
      />
      <p className="text-xs text-muted-foreground">
        Stage, assignment, and notes are managed on the lead page (not here).
      </p>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update lead" : "Create lead"}
        </Button>
      </div>
    </form>
  );
}
