"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Wrench } from "lucide-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";

interface StatsCardsProps {
  totalLeads: number;
  conversionRate: number;
  revenue: number;
  activeInstallations: number;
}

const stats = [
  { key: "totalLeads", label: "Total Leads", icon: Users, color: "text-blue-600 bg-blue-50", format: (v: number) => formatNumber(v, 0) },
  { key: "conversionRate", label: "Conversion Rate", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50", format: (v: number) => formatPercent(v) },
  { key: "revenue", label: "Revenue", icon: DollarSign, color: "text-brand-600 bg-brand-50", format: (v: number) => formatCurrency(v) },
  { key: "activeInstallations", label: "Active Installs", icon: Wrench, color: "text-purple-600 bg-purple-50", format: (v: number) => formatNumber(v, 0) },
] as const;

export function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.key}>
          <CardContent className="flex items-center gap-4 py-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground font-[family-name:var(--font-geist-mono)]">
                {stat.format(props[stat.key])}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
