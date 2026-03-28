import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const noteBodySchema = z.object({
  content: z.string().min(1, "Note cannot be empty").max(20_000),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: leadId } = await params;
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = noteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const author = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!author) {
    return NextResponse.json(
      { error: "Your account is not linked to a valid user. Sign out and sign in again." },
      { status: 401 }
    );
  }

  const note = await prisma.leadNote.create({
    data: {
      leadId,
      content: parsed.data.content.trim(),
      createdById: author.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
}
