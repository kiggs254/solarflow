import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { userCreateSchema } from "@/lib/validations";

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

export async function GET() {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
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
  return NextResponse.json({ data: users.map(publicUser) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const body = await req.json();
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        passwordHash,
      },
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
    return NextResponse.json(publicUser(user), { status: 201 });
  } catch (e: unknown) {
    const dup = e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002";
    return NextResponse.json({ error: dup ? "Email already in use" : "Failed to create user" }, { status: 400 });
  }
}
