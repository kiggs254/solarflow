import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/validations";

const proposalInclude = {
  lead: { include: { project: true, pipelineStage: true } },
  project: true,
  proposalStatus: true,
  solarPanel: true,
  battery: true,
  inverterRel: true,
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: proposalInclude,
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { publicSharePasswordHash: _hash, ...safe } = proposal;
  return NextResponse.json({ ...safe, publicShareHasPassword: Boolean(_hash) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = proposalSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.statusId) {
    const exists = await prisma.proposalStatusOption.findFirst({
      where: { id: parsed.data.statusId, isActive: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Invalid statusId" }, { status: 400 });
    }
  }

  const proposal = await prisma.proposal.update({
    where: { id },
    data: parsed.data,
    include: proposalInclude,
  });
  const { publicSharePasswordHash: _hash, ...safe } = proposal;
  return NextResponse.json({ ...safe, publicShareHasPassword: Boolean(_hash) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.proposal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
