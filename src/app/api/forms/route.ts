import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { leadCaptureFormCreateSchema } from "@/lib/validations";
import { validateFormFieldDefinitions } from "@/lib/lead-forms";

export async function GET() {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const forms = await prisma.leadCaptureForm.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { leads: true } },
    },
  });
  return NextResponse.json({ data: forms });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const body = await req.json();
  const parsed = leadCaptureFormCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const fieldError = validateFormFieldDefinitions(parsed.data.fields);
  if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

  if (parsed.data.defaultStageId) {
    const st = await prisma.leadPipelineStage.findFirst({
      where: { id: parsed.data.defaultStageId, isActive: true },
    });
    if (!st) return NextResponse.json({ error: "Invalid defaultStageId" }, { status: 400 });
  }

  if (parsed.data.assignToUserId) {
    const u = await prisma.user.findUnique({ where: { id: parsed.data.assignToUserId } });
    if (!u) return NextResponse.json({ error: "Invalid assignToUserId" }, { status: 400 });
  }

  try {
    const row = await prisma.leadCaptureForm.create({
      data: {
        name: parsed.data.name.trim(),
        slug: parsed.data.slug.trim().toLowerCase(),
        description: parsed.data.description?.trim() ?? null,
        fields: parsed.data.fields as object[],
        isActive: parsed.data.isActive ?? true,
        defaultStageId: parsed.data.defaultStageId ?? null,
        assignToUserId: parsed.data.assignToUserId ?? null,
        successMessage: parsed.data.successMessage?.trim() ?? null,
        brandColor: parsed.data.brandColor ?? "#f59e0b",
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
  }
}
