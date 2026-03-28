"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { statusColor, formatCurrency, formatNumber, formatDate } from "@/lib/utils";

interface ProjectTableProps {
  projects: any[];
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/70 py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-foreground">{children}</div>
    </div>
  );
}

export function ProjectTable({ projects }: ProjectTableProps) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {projects.map((p: any) => (
          <Card key={p.id} className="p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <Link href={`/projects/${p.id}`} className="text-base font-semibold text-foreground hover:text-brand-600">
                {p.name}
              </Link>
              {p.projectStatus ? (
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(p.projectStatus.key)}`}
                >
                  {p.projectStatus.label}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <Field label="Lead">
              {p.lead ? (
                <Link href={`/leads/${p.leadId}`} className="text-brand-600 hover:underline">
                  {p.lead.name}
                </Link>
              ) : (
                "—"
              )}
            </Field>
            <Field label="System">
              {p.systemSizeKw != null ? `${formatNumber(p.systemSizeKw)} kW` : "—"}
            </Field>
            <Field label="Est. cost">
              {p.estimatedCost != null ? formatCurrency(p.estimatedCost) : "—"}
            </Field>
            <Field label="Tasks">{p._count?.tasks ?? 0}</Field>
            <Field label="Created">
              <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>
            </Field>
          </Card>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Est. cost</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/projects/${p.id}`} className="font-medium text-foreground hover:text-brand-600">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {p.lead ? (
                    <Link href={`/leads/${p.leadId}`} className="hover:text-brand-600">
                      {p.lead.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {p.projectStatus ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(p.projectStatus.key)}`}
                    >
                      {p.projectStatus.label}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.systemSizeKw != null ? `${formatNumber(p.systemSizeKw)} kW` : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.estimatedCost != null ? formatCurrency(p.estimatedCost) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{p._count?.tasks ?? 0}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
