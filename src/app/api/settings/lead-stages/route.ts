import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { leadStageUpsertSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await prisma.leadPipelineStage.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const body = await req.json();
  const parsed = leadStageUpsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const maxOrder = await prisma.leadPipelineStage.aggregate({ _max: { sortOrder: true } });
  const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  try {
    const row = await prisma.leadPipelineStage.create({
      data: {
        key: parsed.data.key,
        label: parsed.data.label,
        sortOrder,
        isActive: parsed.data.isActive ?? true,
        outcome: parsed.data.outcome ?? "NONE",
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002"
      ? "Key already exists"
      : "Failed to create stage";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
