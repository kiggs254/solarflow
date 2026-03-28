import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDefaultProjectStatusId,
  getLeadStageIdByKey,
  getProposalStatusIdByKey,
} from "@/lib/workflow-defaults";

/**
 * Creates a Project from a Proposal when the lead has no project yet.
 * Optionally moves the lead to the first active pipeline stage with outcome WON (if one exists).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      proposalStatus: true,
      lead: { include: { project: true } },
    },
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (proposal.projectId) {
    return NextResponse.json(
      { error: "Proposal is already linked to a project", projectId: proposal.projectId },
      { status: 400 }
    );
  }

  if (proposal.proposalStatus.blocksConversion) {
    return NextResponse.json(
      { error: "This proposal status does not allow conversion to a project" },
      { status: 400 }
    );
  }

  if (proposal.lead.project) {
    return NextResponse.json(
      {
        error: "This lead already has a project",
        projectId: proposal.lead.project.id,
      },
      { status: 409 }
    );
  }

  let defaultStatusId: string;
  try {
    defaultStatusId = await getDefaultProjectStatusId();
  } catch {
    return NextResponse.json({ error: "No project statuses configured" }, { status: 503 });
  }

  const convertedStatusId = await getProposalStatusIdByKey("CONVERTED");
  if (!convertedStatusId) {
    return NextResponse.json({ error: "CONVERTED proposal status missing — run seed" }, { status: 503 });
  }

  const estimatedCost = proposal.grossCost ?? proposal.installCost;
  const annualOutput = proposal.yearlyProductionKwh ?? null;

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name: proposal.title || `Project — ${proposal.lead.name}`,
        statusId: defaultStatusId,
        systemSizeKw: proposal.systemSizeKw,
        panelCount: proposal.panelCount,
        estimatedCost,
        annualOutput,
        leadId: proposal.leadId,
      },
    });

    await tx.proposal.update({
      where: { id: proposal.id },
      data: {
        projectId: p.id,
        statusId: convertedStatusId,
      },
    });

    const wonStage = await tx.leadPipelineStage.findFirst({
      where: { outcome: "WON", isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    if (wonStage) {
      await tx.lead.update({
        where: { id: proposal.leadId },
        data: { stageId: wonStage.id },
      });
    }

    return p;
  });

  const full = await prisma.project.findUnique({
    where: { id: project.id },
    include: {
      projectStatus: true,
      lead: { include: { pipelineStage: true } },
    },
  });

  return NextResponse.json({ project: full }, { status: 201 });
}
