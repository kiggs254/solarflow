"use client";

import { useDashboard } from "@/hooks/use-dashboard";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentLeads } from "@/components/dashboard/recent-leads";
import { PageLoading } from "@/components/ui/loading";

export default function DashboardPage() {
  const { stats, isLoading } = useDashboard();

  if (isLoading || !stats) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your solar business</p>
      </div>

      <StatsCards
        totalLeads={stats.totalLeads}
        conversionRate={stats.conversionRate}
        revenue={stats.revenue}
        activeInstallations={stats.activeInstallations}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PipelineChart rows={stats.pipelineChartRows ?? []} leadsByStage={stats.leadsByStage} />
        <RevenueChart data={stats.monthlyRevenue} />
      </div>

      <RecentLeads leads={stats.recentLeads} />
    </div>
  );
}
