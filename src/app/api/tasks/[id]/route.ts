import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      lead: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = taskSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dueDate !== undefined) {
    data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }
  if (parsed.data.reminderAt !== undefined) {
    data.reminderAt = parsed.data.reminderAt ? new Date(parsed.data.reminderAt) : null;
    data.reminderSent = false;
  }
  if (parsed.data.leadId !== undefined) {
    const lid = parsed.data.leadId;
    const normalized = lid === "" || lid === null ? null : lid;
    if (normalized) {
      const exists = await prisma.lead.findUnique({ where: { id: normalized }, select: { id: true } });
      if (!exists) return NextResponse.json({ error: "Invalid leadId" }, { status: 400 });
    }
    data.leadId = normalized;
  }

  if (parsed.data.assignedToId !== undefined) {
    const aid = parsed.data.assignedToId;
    if (aid === null || aid === "") {
      data.assignedToId = null;
    } else {
      const u = await prisma.user.findUnique({ where: { id: aid }, select: { id: true } });
      if (!u) return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
      data.assignedToId = u.id;
    }
  }

  Object.keys(data).forEach((k) => {
    if (data[k] === undefined) delete data[k];
  });

  const task = await prisma.task.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
    include: {
      project: true,
      lead: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
