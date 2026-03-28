import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { userPatchSchema } from "@/lib/validations";

function publicUser(u: {
  id: string;
  email: string;
  name: string;
  role: string;
  notifyProposalAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    notifyProposalAccepted: u.notifyProposalAccepted,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      notifyProposalAccepted: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(publicUser(user));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();
  const parsed = userPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        notifyProposalAccepted: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(publicUser(user));
  } catch (e: unknown) {
    const dup = e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002";
    return NextResponse.json({ error: dup ? "Email already in use" : "Not found" }, { status: dup ? 400 : 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const { id } = await params;
  if (session!.user!.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
