import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { proposalStatusPatchSchema } from "@/lib/validations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();
  const parsed = proposalStatusPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const row = await prisma.proposalStatusOption.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Not found or duplicate key" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const { id } = await params;
  const inUse = await prisma.proposal.count({ where: { statusId: id } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${inUse} proposal(s) use this status` },
      { status: 409 }
    );
  }

  try {
    await prisma.proposalStatusOption.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
