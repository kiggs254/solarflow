import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validations";
import { getDefaultProjectStatusId } from "@/lib/workflow-defaults";

const projectListInclude = {
  projectStatus: true,
  lead: true,
  _count: { select: { tasks: true, proposals: true } },
} as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusId = searchParams.get("statusId");
  const where = statusId ? { statusId } : {};

  const projects = await prisma.project.findMany({
    where,
    include: projectListInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: projects });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let statusId = parsed.data.statusId;
  if (!statusId) {
    try {
      statusId = await getDefaultProjectStatusId();
    } catch {
      return NextResponse.json({ error: "No project statuses configured" }, { status: 503 });
    }
  } else {
    const exists = await prisma.projectStatusOption.findFirst({
      where: { id: statusId, isActive: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Invalid statusId" }, { status: 400 });
    }
  }

  const { statusId: _st, ...rest } = parsed.data;
  const project = await prisma.project.create({
    data: {
      ...rest,
      statusId,
    },
    include: projectListInclude,
  });
  return NextResponse.json(project, { status: 201 });
}
