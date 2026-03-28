import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const leadId = searchParams.get("leadId");
  const completed = searchParams.get("completed");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (leadId) where.leadId = leadId;
  if (completed !== null && completed !== undefined && completed !== "") where.completed = completed === "true";

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: true,
      lead: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ data: tasks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const leadIdRaw = parsed.data.leadId;
  const normalizedLeadId =
    leadIdRaw === undefined || leadIdRaw === null || leadIdRaw === "" ? null : leadIdRaw;
  if (normalizedLeadId) {
    const exists = await prisma.lead.findUnique({ where: { id: normalizedLeadId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Invalid leadId" }, { status: 400 });
  }

  const rawAssignee = parsed.data.assignedToId;
  const explicitAssignee =
    rawAssignee !== null && rawAssignee !== undefined && String(rawAssignee).trim() !== ""
      ? String(rawAssignee).trim()
      : null;

  let assignedToId: string | null = null;
  if (explicitAssignee) {
    const assignee = await prisma.user.findUnique({
      where: { id: explicitAssignee },
      select: { id: true },
    });
    if (!assignee) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }
    assignedToId = assignee.id;
  } else if (session.user?.id) {
    const self = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    assignedToId = self?.id ?? null;
  }

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description?.trim() ? parsed.data.description : null,
      completed: parsed.data.completed ?? false,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      reminderAt: parsed.data.reminderAt ? new Date(parsed.data.reminderAt) : null,
      reminderSent: false,
      projectId: parsed.data.projectId ?? null,
      leadId: normalizedLeadId,
      assignedToId,
    },
    include: {
      project: true,
      lead: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
