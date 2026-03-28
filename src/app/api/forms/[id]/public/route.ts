import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFormFieldsJson, sortFormFields } from "@/lib/lead-forms";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.leadCaptureForm.findFirst({
    where: { id, isActive: true },
  });
  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  }

  const fields = sortFormFields(parseFormFieldsJson(form.fields));
  return NextResponse.json(
    {
      id: form.id,
      name: form.name,
      description: form.description,
      brandColor: form.brandColor ?? "#f59e0b",
      successMessage: form.successMessage,
      fields,
    },
    { headers: corsHeaders }
  );
}
