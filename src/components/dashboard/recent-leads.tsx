"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { stageColor, formatDate } from "@/lib/utils";

interface RecentLeadsProps {
  leads: any[];
}

export function RecentLeads({ leads }: RecentLeadsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Leads</CardTitle>
        <Link href="/leads" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {leads.map((lead: any) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors sm:px-6"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{lead.name}</p>
                <p className="text-xs text-muted-foreground">
                  {lead.assignedTo?.name ?? "Unassigned"} &middot; {formatDate(lead.createdAt)}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor(lead.pipelineStage?.key ?? "")}`}
              >
                {lead.pipelineStage?.label ?? "—"}
              </span>
            </Link>
          ))}
          {leads.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">No leads yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
