"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLead } from "@/hooks/use-leads";
import { LeadForm } from "@/components/leads/lead-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const lead = await createLead(data);
      router.push(`/leads/${lead.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/leads"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Lead</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead information</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadForm onSubmit={handleSubmit} onCancel={() => router.push("/leads")} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
