import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stages = await prisma.leadPipelineStage.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, key: true, label: true, sortOrder: true, outcome: true },
  });

  const wonStageIds = stages.filter((s) => s.outcome === "WON").map((s) => s.id);
  const lostStageIds = stages.filter((s) => s.outcome === "LOST").map((s) => s.id);

  const installationStatusIds = (
    await prisma.projectStatusOption.findMany({
      where: { isActiveInstallation: true, isActive: true },
      select: { id: true },
    })
  ).map((s) => s.id);

  const [totalLeads, wonLeads, lostLeads, countsByStageId, activeInstallations, revenue, recentLeads] =
    await Promise.all([
      prisma.lead.count(),
      wonStageIds.length ? prisma.lead.count({ where: { stageId: { in: wonStageIds } } }) : 0,
      lostStageIds.length ? prisma.lead.count({ where: { stageId: { in: lostStageIds } } }) : 0,
      prisma.lead.groupBy({
        by: ["stageId"],
        _count: { _all: true },
      }),
      installationStatusIds.length
        ? prisma.project.count({ where: { statusId: { in: installationStatusIds } } })
        : 0,
      wonStageIds.length
        ? prisma.proposal.aggregate({
            where: { lead: { stageId: { in: wonStageIds } } },
            _sum: { installCost: true },
          })
        : { _sum: { installCost: null as number | null } },
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          assignedTo: { select: { name: true } },
          pipelineStage: true,
        },
      }),
    ]);

  const countMap = Object.fromEntries(countsByStageId.map((c) => [c.stageId, c._count._all]));

  const pipelineChartRows = stages.map((s) => ({
    id: s.id,
    key: s.key,
    label: s.label,
    count: countMap[s.id] ?? 0,
  }));

  const closedLeads = wonLeads + lostLeads;
  const conversionRate = closedLeads > 0 ? (wonLeads / closedLeads) * 100 : 0;

  /** @deprecated keyed by stage key for older clients — prefer pipelineChartRows */
  const leadsByStage: Record<string, number> = {};
  for (const s of stages) {
    leadsByStage[s.key] = countMap[s.id] ?? 0;
  }

  return NextResponse.json({
    totalLeads,
    conversionRate: Math.round(conversionRate * 10) / 10,
    revenue: revenue._sum.installCost || 0,
    activeInstallations,
    leadsByStage,
    pipelineChartRows,
    recentLeads,
    monthlyRevenue: [],
  });
}
