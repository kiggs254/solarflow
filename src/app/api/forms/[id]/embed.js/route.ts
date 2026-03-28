import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildFormEmbedScript } from "@/lib/form-embed-script";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.leadCaptureForm.findFirst({
    where: { id, isActive: true },
    select: { id: true },
  });
  if (!form) {
    return new NextResponse("// SolarFlow: form not found or inactive\n", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const origin = new URL(req.url).origin;
  const script = buildFormEmbedScript(id, origin);

  return new NextResponse(script, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=120",
    },
  });
}
