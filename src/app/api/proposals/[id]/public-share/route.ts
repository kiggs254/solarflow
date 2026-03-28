import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { proposalPublicShareBodySchema } from "@/lib/validations";

function publicShareResponse(row: {
  publicShareToken: string | null;
  publicSharePasswordHash: string | null;
}) {
  return {
    publicShareToken: row.publicShareToken,
    publicShareHasPassword: Boolean(row.publicSharePasswordHash),
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  const parsed = proposalPublicShareBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.proposal.findUnique({
    where: { id },
    select: { id: true, publicShareToken: true, publicSharePasswordHash: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let token = existing.publicShareToken;
  if (parsed.data.regenerate || !token) {
    token = randomBytes(32).toString("base64url");
  }

  let passwordHash = existing.publicSharePasswordHash;
  if (parsed.data.password !== undefined) {
    if (parsed.data.password === null) {
      passwordHash = null;
    } else {
      passwordHash = await bcrypt.hash(parsed.data.password, 12);
    }
  }

  const updated = await prisma.proposal.update({
    where: { id },
    data: { publicShareToken: token, publicSharePasswordHash: passwordHash },
    select: { publicShareToken: true, publicSharePasswordHash: true },
  });

  return NextResponse.json(publicShareResponse(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const updated = await prisma.proposal.update({
      where: { id },
      data: { publicShareToken: null, publicSharePasswordHash: null },
      select: { publicShareToken: true, publicSharePasswordHash: true },
    });
    return NextResponse.json(publicShareResponse(updated));
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
