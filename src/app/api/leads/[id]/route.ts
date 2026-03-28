import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validations";

const leadDetailInclude = {
  pipelineStage: true,
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
  sourceForm: { select: { id: true, name: true, slug: true, fields: true } },
  project: { include: { tasks: true } },
  proposals: { include: { proposalStatus: true } },
  leadNotes: {
    orderBy: { createdAt: "desc" as const },
    include: { createdBy: { select: { id: true, name: true } } },
  },
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: leadDetailInclude,
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = leadSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.stageId) {
    const exists = await prisma.leadPipelineStage.findFirst({
      where: { id: parsed.data.stageId, isActive: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Invalid stageId" }, { status: 400 });
    }
  }

  if (parsed.data.assignedToId !== undefined) {
    const aid = parsed.data.assignedToId;
    if (aid !== null && aid !== "") {
      const u = await prisma.user.findUnique({ where: { id: aid } });
      if (!u) return NextResponse.json({ error: "Invalid assignedToId" }, { status: 400 });
    }
  }

  const updatePayload = { ...parsed.data } as Record<string, unknown>;
  if (updatePayload.assignedToId === "") {
    updatePayload.assignedToId = null;
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: updatePayload as Prisma.LeadUncheckedUpdateInput,
    include: { pipelineStage: true },
  });
  return NextResponse.json(lead);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
