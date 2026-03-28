import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { leadCaptureFormPatchSchema } from "@/lib/validations";
import { validateFormFieldDefinitions } from "@/lib/lead-forms";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const { id } = await params;
  const form = await prisma.leadCaptureForm.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(form);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.leadCaptureForm.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = leadCaptureFormPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.fields) {
    const fieldError = validateFormFieldDefinitions(parsed.data.fields);
    if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });
  }

  if (parsed.data.defaultStageId !== undefined && parsed.data.defaultStageId !== null) {
    const st = await prisma.leadPipelineStage.findFirst({
      where: { id: parsed.data.defaultStageId, isActive: true },
    });
    if (!st) return NextResponse.json({ error: "Invalid defaultStageId" }, { status: 400 });
  }

  if (parsed.data.assignToUserId !== undefined && parsed.data.assignToUserId !== null) {
    const u = await prisma.user.findUnique({ where: { id: parsed.data.assignToUserId } });
    if (!u) return NextResponse.json({ error: "Invalid assignToUserId" }, { status: 400 });
  }

  try {
    const row = await prisma.leadCaptureForm.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name.trim() }),
        ...(parsed.data.slug !== undefined && { slug: parsed.data.slug.trim().toLowerCase() }),
        ...(parsed.data.description !== undefined && {
          description: parsed.data.description?.trim() ?? null,
        }),
        ...(parsed.data.fields !== undefined && { fields: parsed.data.fields as object[] }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        ...(parsed.data.defaultStageId !== undefined && { defaultStageId: parsed.data.defaultStageId }),
        ...(parsed.data.assignToUserId !== undefined && { assignToUserId: parsed.data.assignToUserId }),
        ...(parsed.data.successMessage !== undefined && {
          successMessage: parsed.data.successMessage?.trim() ?? null,
        }),
        ...(parsed.data.brandColor !== undefined && { brandColor: parsed.data.brandColor }),
      },
    });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.leadCaptureForm.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete form while leads reference it. Clear source form on leads first." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
}
