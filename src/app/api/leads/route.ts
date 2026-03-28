import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validations";
import { getDefaultLeadStageId } from "@/lib/workflow-defaults";
import { notifyNewLead } from "@/lib/notifications";

const leadListInclude = {
  pipelineStage: true,
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
  project: true,
  _count: { select: { proposals: true } },
} as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stageId = searchParams.get("stageId");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");

  const where = stageId ? { stageId } : {};

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: leadListInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ data: leads, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let stageId = parsed.data.stageId;
  if (!stageId) {
    try {
      stageId = await getDefaultLeadStageId();
    } catch {
      return NextResponse.json({ error: "No pipeline stages configured" }, { status: 503 });
    }
  } else {
    const exists = await prisma.leadPipelineStage.findFirst({
      where: { id: stageId, isActive: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Invalid stageId" }, { status: 400 });
    }
  }

  const { stageId: _s, assignedToId: assignRaw, ...rest } = parsed.data;
  const assignId =
    assignRaw === undefined || assignRaw === null || assignRaw === ""
      ? null
      : assignRaw;
  if (assignId) {
    const u = await prisma.user.findUnique({ where: { id: assignId } });
    if (!u) return NextResponse.json({ error: "Invalid assignedToId" }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      ...rest,
      stageId,
      assignedToId: assignId,
    } as Prisma.LeadUncheckedCreateInput,
    include: { pipelineStage: true },
  });

  try {
    await notifyNewLead({
      leadId: lead.id,
      leadName: lead.name,
      assignedToId: lead.assignedToId,
    });
  } catch (e) {
    console.warn("[leads POST] notifyNewLead failed:", e);
  }

  return NextResponse.json(lead, { status: 201 });
}
