import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultLeadStageId } from "@/lib/workflow-defaults";
import {
  checkPublicFormRateLimit,
  clientIpFromRequest,
  geocodeAddressIfPossible,
  parseFormFieldsJson,
  sortFormFields,
  type FormFieldDef,
} from "@/lib/lead-forms";
import { notifyNewLead } from "@/lib/notifications";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

function normalizeFieldValue(f: FormFieldDef, raw: unknown): unknown {
  if (f.type === "checkbox") {
    if (raw === true || raw === "true" || raw === "on" || raw === 1 || raw === "1") return true;
    return false;
  }
  if (f.type === "number") {
    if (raw === undefined || raw === null || raw === "") return null;
    const n = typeof raw === "number" ? raw : parseFloat(String(raw));
    return Number.isFinite(n) ? n : null;
  }
  if (raw === undefined || raw === null) return "";
  return typeof raw === "string" ? raw.trim() : String(raw);
}

function validateFieldValue(f: FormFieldDef, value: unknown): string | null {
  if (f.required) {
    if (f.type === "checkbox") {
      if (value !== true) return `${f.label} is required`;
    } else if (isEmptyValue(value)) {
      return `${f.label} is required`;
    }
  }
  if (!isEmptyValue(value) && f.type === "email") {
    const s = String(value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return `${f.label} must be a valid email`;
  }
  if (f.type === "select" && !isEmptyValue(value) && f.options?.length) {
    if (!f.options.includes(String(value))) return `Invalid option for ${f.label}`;
  }
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = await params;
  const ip = clientIpFromRequest(req);
  if (!checkPublicFormRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Try again in a minute." },
      { status: 429, headers: corsHeaders }
    );
  }

  const form = await prisma.leadCaptureForm.findFirst({
    where: { id: formId, isActive: true },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400, headers: corsHeaders });
  }

  const honeypot = body.website;
  if (honeypot != null && String(honeypot).trim() !== "") {
    return NextResponse.json({ ok: true, leadId: null }, { headers: corsHeaders });
  }

  const fields = sortFormFields(parseFormFieldsJson(form.fields));
  const errors: string[] = [];

  let name = "";
  let email: string | null = null;
  let phone: string | null = null;
  let address: string | null = null;
  let notes: string | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;
  const customFields: Record<string, unknown> = {};

  for (const f of fields) {
    const raw = body[f.key];
    const value = normalizeFieldValue(f, raw);
    const err = validateFieldValue(f, value);
    if (err) errors.push(err);

    if (f.isBuiltIn) {
      switch (f.key) {
        case "name":
          name = String(value ?? "").trim();
          break;
        case "email":
          email = isEmptyValue(value) ? null : String(value);
          break;
        case "phone":
          phone = isEmptyValue(value) ? null : String(value);
          break;
        case "address":
          address = isEmptyValue(value) ? null : String(value);
          if (f.key === "address" && f.isBuiltIn) {
            const latRaw = body.latitude;
            const lngRaw = body.longitude;
            if (typeof latRaw === "number" && typeof lngRaw === "number") {
              latitude = latRaw;
              longitude = lngRaw;
            } else if (typeof latRaw === "string" && typeof lngRaw === "string") {
              const la = parseFloat(latRaw);
              const lo = parseFloat(lngRaw);
              if (Number.isFinite(la) && Number.isFinite(lo)) {
                latitude = la;
                longitude = lo;
              }
            }
          }
          break;
        case "notes":
          notes = isEmptyValue(value) ? null : String(value);
          break;
        default:
          break;
      }
    } else {
      customFields[f.key] = value;
      if (f.type === "address" && !isEmptyValue(value)) {
        const latK = `${f.key}_lat`;
        const lngK = `${f.key}_lng`;
        const la = body[latK];
        const lo = body[lngK];
        if (typeof la === "number" && typeof lo === "number") {
          customFields[`${f.key}_latitude`] = la;
          customFields[`${f.key}_longitude`] = lo;
        } else if (typeof la === "string" && typeof lo === "string") {
          const laN = parseFloat(la);
          const loN = parseFloat(lo);
          if (Number.isFinite(laN) && Number.isFinite(loN)) {
            customFields[`${f.key}_latitude`] = laN;
            customFields[`${f.key}_longitude`] = loN;
          }
        }
      }
    }
  }

  if (!name) errors.push("Name is required");

  if (errors.length) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400, headers: corsHeaders });
  }

  if (address && (latitude == null || longitude == null)) {
    const geo = await geocodeAddressIfPossible(address);
    if (geo) {
      latitude = geo.lat;
      longitude = geo.lng;
    }
  }

  let stageId = form.defaultStageId;
  if (!stageId) {
    try {
      stageId = await getDefaultLeadStageId();
    } catch {
      return NextResponse.json({ error: "Lead pipeline is not configured" }, { status: 503, headers: corsHeaders });
    }
  } else {
    const st = await prisma.leadPipelineStage.findFirst({
      where: { id: stageId, isActive: true },
    });
    if (!st) {
      try {
        stageId = await getDefaultLeadStageId();
      } catch {
        return NextResponse.json({ error: "Lead pipeline is not configured" }, { status: 503, headers: corsHeaders });
      }
    }
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      email,
      phone,
      address,
      latitude,
      longitude,
      notes,
      stageId,
      assignedToId: form.assignToUserId ?? null,
      customFields: Object.keys(customFields).length ? (customFields as object) : undefined,
      sourceFormId: form.id,
    },
    include: { pipelineStage: true },
  });

  try {
    await notifyNewLead({
      leadId: lead.id,
      leadName: lead.name,
      assignedToId: lead.assignedToId,
    });
  } catch (e) {
    console.warn("[form submit] notifyNewLead failed:", e);
  }

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201, headers: corsHeaders });
}
