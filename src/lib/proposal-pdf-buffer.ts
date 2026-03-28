import { prisma } from "@/lib/prisma";

const proposalInclude = {
  lead: true,
  project: true,
  solarPanel: true,
  battery: true,
  inverterRel: true,
} as const;

export async function getProposalForPdf(id: string) {
  return prisma.proposal.findUnique({
    where: { id },
    include: proposalInclude,
  });
}

export async function renderProposalPdfBuffer(proposalId: string): Promise<Uint8Array> {
  const proposal = await getProposalForPdf(proposalId);
  if (!proposal) {
    throw new Error("Proposal not found");
  }

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { ProposalPDF } = await import("@/components/proposals/proposal-pdf");
  const React = await import("react");

  const buffer = await renderToBuffer(
    React.createElement(ProposalPDF, { proposal, lead: proposal.lead }) as any
  );

  return new Uint8Array(buffer);
}
