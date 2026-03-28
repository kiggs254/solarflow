"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { stageColor, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface LeadTableProps {
  leads: any[];
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/70 py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-foreground">{children}</div>
    </div>
  );
}

export function LeadTable({ leads }: LeadTableProps) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {leads.map((lead: any) => (
          <Card key={lead.id} className="p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <Link
                href={`/leads/${lead.id}`}
                className="text-base font-semibold text-foreground hover:text-brand-600"
              >
                {lead.name}
              </Link>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor(lead.pipelineStage?.key ?? "")}`}
              >
                {lead.pipelineStage?.label ?? "—"}
              </span>
            </div>
            <Field label="Email">{lead.email || "—"}</Field>
            <Field label="Phone">{lead.phone || "—"}</Field>
            <Field label="Assigned">{lead.assignedTo?.name || "Unassigned"}</Field>
            <Field label="Created">
              <span className="text-muted-foreground">{formatDate(lead.createdAt)}</span>
            </Field>
          </Card>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead: any) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <Link href={`/leads/${lead.id}`} className="font-medium text-foreground hover:text-brand-600">
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell>{lead.email || "—"}</TableCell>
                <TableCell>{lead.phone || "—"}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor(lead.pipelineStage?.key ?? "")}`}
                  >
                    {lead.pipelineStage?.label ?? "—"}
                  </span>
                </TableCell>
                <TableCell>{lead.assignedTo?.name || "Unassigned"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
