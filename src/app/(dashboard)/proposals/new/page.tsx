"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProposal } from "@/hooks/use-proposals";
import { useLeads } from "@/hooks/use-leads";
import { useProposalStatuses } from "@/hooks/use-workflows";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProposalPage() {
  const router = useRouter();
  const { statuses, isLoading } = useProposalStatuses();
  const { leads } = useLeads();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const proposal = await createProposal(data);
      router.push(`/proposals/${proposal.id}`);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/proposals"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Proposal</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProposalForm
            statuses={statuses}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/proposals")}
            loading={loading}
            leads={leads.map((l: any) => ({ id: l.id, name: l.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
