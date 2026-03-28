"use client";

import { useMemo, useState } from "react";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import type { FormFieldDef } from "@/lib/lead-forms";
import { cn } from "@/lib/utils";

type LatLng = { lat: number; lng: number };

export interface PublicLeadFormProps {
  formId: string;
  name: string;
  description?: string | null;
  brandColor: string;
  successMessage?: string | null;
  fields: FormFieldDef[];
}

export function PublicLeadForm({
  formId,
  name,
  description,
  brandColor,
  successMessage,
  fields,
}: PublicLeadFormProps) {
  const sorted = useMemo(() => [...fields].sort((a, b) => a.sortOrder - b.sortOrder), [fields]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    sorted.forEach((f) => {
      if (f.type === "checkbox") v[f.key] = "false";
      else v[f.key] = "";
    });
    return v;
  });

  const [checkboxes, setCheckboxes] = useState<Record<string, boolean>>(() => {
    const c: Record<string, boolean> = {};
    sorted.filter((f) => f.type === "checkbox").forEach((f) => {
      c[f.key] = false;
    });
    return c;
  });

  const [addressMeta, setAddressMeta] = useState<{
    builtIn?: LatLng | null;
    custom: Record<string, LatLng | undefined>;
  }>({ custom: {} });

  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setField = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = { website: honeypot };
    for (const f of sorted) {
      if (f.type === "checkbox") {
        payload[f.key] = checkboxes[f.key] === true;
        continue;
      }
      if (f.type === "number") {
        const s = values[f.key]?.trim();
        payload[f.key] = s === "" ? "" : Number(s);
        continue;
      }
      payload[f.key] = values[f.key] ?? "";
    }
    const builtIn = addressMeta.builtIn;
    if (builtIn) {
      payload.latitude = builtIn.lat;
      payload.longitude = builtIn.lng;
    }
    for (const k of Object.keys(addressMeta.custom)) {
      const ll = addressMeta.custom[k];
      if (ll) {
        payload[`${k}_lat`] = ll.lat;
        payload[`${k}_lng`] = ll.lng;
      }
    }
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Submit failed");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg"
        style={{ borderColor: `${brandColor}33` }}
      >
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
          style={{ backgroundColor: brandColor }}
        >
          ✓
        </div>
        <h2 className="text-xl font-semibold text-foreground">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {successMessage?.trim() || "We received your information and will be in touch soon."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-10"
      style={{ borderTopWidth: 4, borderTopColor: brandColor }}
    >
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{name}</h1>
      {description?.trim() && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="relative mt-8 space-y-5">
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0" aria-hidden>
          <label>
            Leave blank
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>
        </div>

        {sorted.map((f) => (
          <div key={f.id}>
            {f.type === "address" ? (
              f.isBuiltIn && f.key === "address" ? (
                <AddressAutocomplete
                  id={`field-${f.id}`}
                  label={f.label + (f.required ? " *" : "")}
                  value={values[f.key] ?? ""}
                  onChange={(addr) => {
                    setField(f.key, addr);
                    setAddressMeta((m) => ({ ...m, builtIn: null }));
                  }}
                  onPlaceResolved={({ address, latitude, longitude }) => {
                    setField(f.key, address);
                    setAddressMeta((m) => ({ ...m, builtIn: { lat: latitude, lng: longitude } }));
                  }}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              ) : (
                <AddressAutocomplete
                  id={`field-${f.id}`}
                  label={f.label + (f.required ? " *" : "")}
                  value={values[f.key] ?? ""}
                  onChange={(addr) => {
                    setField(f.key, addr);
                    setAddressMeta((m) => ({
                      ...m,
                      custom: { ...m.custom, [f.key]: undefined },
                    }));
                  }}
                  onPlaceResolved={({ address, latitude, longitude }) => {
                    setField(f.key, address);
                    setAddressMeta((m) => ({
                      ...m,
                      custom: { ...m.custom, [f.key]: { lat: latitude, lng: longitude } },
                    }));
                  }}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              )
            ) : f.type === "textarea" ? (
              <div className="space-y-1.5">
                <label htmlFor={`field-${f.id}`} className="text-sm font-medium text-foreground">
                  {f.label}
                  {f.required && <span className="text-brand-600"> *</span>}
                </label>
                <textarea
                  id={`field-${f.id}`}
                  className={cn(
                    "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm",
                    "focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
                  )}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              </div>
            ) : f.type === "select" ? (
              <div className="space-y-1.5">
                <label htmlFor={`field-${f.id}`} className="text-sm font-medium text-foreground">
                  {f.label}
                  {f.required && <span className="text-brand-600"> *</span>}
                </label>
                <select
                  id={`field-${f.id}`}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm",
                    "focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
                  )}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  required={f.required}
                >
                  <option value="">Select…</option>
                  {(f.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ) : f.type === "checkbox" ? (
              <label className="flex items-start gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={checkboxes[f.key] === true}
                  onChange={(e) =>
                    setCheckboxes((c) => ({ ...c, [f.key]: e.target.checked }))
                  }
                  required={f.required}
                />
                <span>
                  {f.label}
                  {f.required && <span className="text-brand-600"> *</span>}
                </span>
              </label>
            ) : f.type === "number" ? (
              <div className="space-y-1.5">
                <label htmlFor={`field-${f.id}`} className="text-sm font-medium text-foreground">
                  {f.label}
                  {f.required && <span className="text-brand-600"> *</span>}
                </label>
                <input
                  id={`field-${f.id}`}
                  type="number"
                  step="any"
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm",
                    "focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
                  )}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor={`field-${f.id}`} className="text-sm font-medium text-foreground">
                  {f.label}
                  {f.required && <span className="text-brand-600"> *</span>}
                </label>
                <input
                  id={`field-${f.id}`}
                  type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm",
                    "focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
                  )}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  autoComplete={
                    f.type === "email" ? "email" : f.type === "phone" ? "tel" : "name"
                  }
                />
              </div>
            )}
          </div>
        ))}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg py-3 text-sm font-semibold text-white shadow-md transition-opacity disabled:opacity-60"
          style={{ backgroundColor: brandColor }}
        >
          {submitting ? "Sending…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
