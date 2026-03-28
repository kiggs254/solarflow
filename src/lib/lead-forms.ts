import type { LeadCaptureFormFieldInput } from "@/lib/validations";

export const BUILT_IN_LEAD_FIELD_KEYS = ["name", "email", "phone", "address", "notes"] as const;
export type BuiltInLeadFieldKey = (typeof BUILT_IN_LEAD_FIELD_KEYS)[number];

export type FormFieldDef = LeadCaptureFormFieldInput;

export function sortFormFields(fields: FormFieldDef[]): FormFieldDef[] {
  return [...fields].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function validateFormFieldDefinitions(fields: FormFieldDef[]): string | null {
  if (!fields.length) return "At least one field is required";
  const keys = new Set<string>();
  for (const f of fields) {
    if (keys.has(f.key)) return `Duplicate field key: ${f.key}`;
    keys.add(f.key);
    if (f.isBuiltIn) {
      if (!BUILT_IN_LEAD_FIELD_KEYS.includes(f.key as BuiltInLeadFieldKey)) {
        return `Invalid built-in key: ${f.key}`;
      }
    } else {
      if (BUILT_IN_LEAD_FIELD_KEYS.includes(f.key as BuiltInLeadFieldKey)) {
        return `Key "${f.key}" is reserved for built-in fields`;
      }
    }
    if (f.type === "select" && (!f.options || f.options.length === 0)) {
      return `Select field "${f.label}" needs at least one option`;
    }
  }
  const nameField = fields.find((f) => f.key === "name");
  if (!nameField) return 'Form must include a built-in "name" field';
  if (!nameField.isBuiltIn || !nameField.required) {
    return 'The "name" field must be built-in and required';
  }
  return null;
}

export function defaultLeadCaptureFormFields(): FormFieldDef[] {
  const now = Date.now();
  return [
    {
      id: `fld_name_${now}`,
      key: "name",
      label: "Full name",
      type: "text",
      required: true,
      placeholder: "Jane Doe",
      isBuiltIn: true,
      sortOrder: 0,
    },
    {
      id: `fld_email_${now}`,
      key: "email",
      label: "Email",
      type: "email",
      required: false,
      placeholder: "you@example.com",
      isBuiltIn: true,
      sortOrder: 1,
    },
    {
      id: `fld_phone_${now}`,
      key: "phone",
      label: "Phone",
      type: "phone",
      required: false,
      placeholder: "(555) 555-5555",
      isBuiltIn: true,
      sortOrder: 2,
    },
    {
      id: `fld_address_${now}`,
      key: "address",
      label: "Street address",
      type: "address",
      required: false,
      placeholder: "Start typing your address",
      isBuiltIn: true,
      sortOrder: 3,
    },
    {
      id: `fld_notes_${now}`,
      key: "notes",
      label: "Notes",
      type: "textarea",
      required: false,
      placeholder: "Tell us about your project",
      isBuiltIn: true,
      sortOrder: 4,
    },
  ];
}

/** In-memory rate limit: max submissions per IP per window */
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

export function checkPublicFormRateLimit(ip: string): boolean {
  const now = Date.now();
  const list = rateBuckets.get(ip) ?? [];
  const fresh = list.filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= RATE_MAX) return false;
  fresh.push(now);
  rateBuckets.set(ip, fresh);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      const pruned = v.filter((t) => now - t < RATE_WINDOW_MS);
      if (pruned.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, pruned);
    }
  }
  return true;
}

export function clientIpFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function geocodeAddressIfPossible(address: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${key}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results?: { geometry: { location: { lat: number; lng: number } } }[];
    };
    if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) return null;
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function parseFormFieldsJson(raw: unknown): FormFieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw as FormFieldDef[];
}
