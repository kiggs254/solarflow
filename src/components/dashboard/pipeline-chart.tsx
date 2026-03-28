"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { PipelineChartRow } from "@/types";

interface PipelineChartProps {
  rows: PipelineChartRow[];
  /** Fallback when `rows` is empty — keyed by stage key */
  leadsByStage?: Record<string, number>;
}

const STAGE_COLORS: Record<string, string> = {
  NEW_LEAD: "#3b82f6",
  QUALIFIED: "#8b5cf6",
  PROPOSAL_GENERATED: "#f59e0b",
  NEGOTIATION: "#f97316",
  WON: "#10b981",
  LOST: "#ef4444",
};

function colorForKey(key: string, index: number): string {
  if (STAGE_COLORS[key]) return STAGE_COLORS[key];
  const palette = ["#6366f1", "#14b8a6", "#ec4899", "#84cc16", "#f43f5e", "#64748b"];
  return palette[index % palette.length];
}

export function PipelineChart({ rows, leadsByStage = {} }: PipelineChartProps) {
  const data =
    rows.length > 0
      ? rows.map((r, i) => ({
          name: r.label,
          count: r.count,
          fill: colorForKey(r.key, i),
        }))
      : Object.entries(leadsByStage).map(([key, count], i) => ({
          name: key.replace(/_/g, " "),
          count,
          fill: colorForKey(key, i),
        }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] min-h-[240px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                stroke="#94a3b8"
                interval={0}
                angle={-28}
                textAnchor="end"
                height={68}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" width={28} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
