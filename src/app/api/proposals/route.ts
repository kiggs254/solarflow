import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/validations";
import { getDefaultProposalStatusId, getLeadStageIdByKey } from "@/lib/workflow-defaults";

const proposalInclude = {
  lead: true,
  project: true,
  proposalStatus: true,
  solarPanel: true,
  battery: true,
  inverterRel: true,
} as const;

function sanitizeProposalJson<T extends { publicSharePasswordHash?: string | null }>(p: T) {
  const { publicSharePasswordHash: h, ...rest } = p;
  return { ...rest, publicShareHasPassword: Boolean(h) };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusId = searchParams.get("statusId");

  const proposals = await prisma.proposal.findMany({
    where: statusId ? { statusId } : undefined,
    include: proposalInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: proposals.map(sanitizeProposalJson) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let statusId = parsed.data.statusId;
  if (!statusId) {
    try {
      statusId = await getDefaultProposalStatusId();
    } catch {
      return NextResponse.json({ error: "No proposal statuses configured" }, { status: 503 });
    }
  } else {
    const exists = await prisma.proposalStatusOption.findFirst({
      where: { id: statusId, isActive: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Invalid statusId" }, { status: 400 });
    }
  }

  const { statusId: _st, ...createData } = parsed.data;

  const proposal = await prisma.proposal.create({
    data: {
      ...createData,
      statusId,
    },
    include: proposalInclude,
  });

  const proposalGenStageId = await getLeadStageIdByKey("PROPOSAL_GENERATED");
  if (proposalGenStageId) {
    await prisma.lead.update({
      where: { id: parsed.data.leadId },
      data: { stageId: proposalGenStageId },
    });
  }

  return NextResponse.json(sanitizeProposalJson(proposal), { status: 201 });
}
