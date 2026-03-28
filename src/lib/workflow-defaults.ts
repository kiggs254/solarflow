import { prisma } from "@/lib/prisma";

export async function getDefaultLeadStageId(): Promise<string> {
  const preferred = await prisma.leadPipelineStage.findFirst({
    where: { isActive: true, key: "NEW_LEAD" },
  });
  if (preferred) return preferred.id;
  const first = await prisma.leadPipelineStage.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  if (!first) throw new Error("No lead pipeline stages configured");
  return first.id;
}

export async function getLeadStageIdByKey(key: string): Promise<string | null> {
  const row = await prisma.leadPipelineStage.findFirst({
    where: { isActive: true, key },
  });
  return row?.id ?? null;
}

export async function getDefaultProjectStatusId(): Promise<string> {
  const preferred = await prisma.projectStatusOption.findFirst({
    where: { isActive: true, key: "DESIGN" },
  });
  if (preferred) return preferred.id;
  const first = await prisma.projectStatusOption.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  if (!first) throw new Error("No project statuses configured");
  return first.id;
}

export async function getDefaultProposalStatusId(): Promise<string> {
  const preferred = await prisma.proposalStatusOption.findFirst({
    where: { isActive: true, key: "DRAFT" },
  });
  if (preferred) return preferred.id;
  const first = await prisma.proposalStatusOption.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  if (!first) throw new Error("No proposal statuses configured");
  return first.id;
}

export async function getProposalStatusIdByKey(key: string): Promise<string | null> {
  const row = await prisma.proposalStatusOption.findFirst({
    where: { key },
  });
  return row?.id ?? null;
}
