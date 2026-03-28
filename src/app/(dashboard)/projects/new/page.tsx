"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/hooks/use-projects";
import { useLeads } from "@/hooks/use-leads";
import { useProjectStatuses } from "@/hooks/use-workflows";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const { statuses, isLoading } = useProjectStatuses();
  const { leads } = useLeads();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const project = await createProject(data);
      router.push(`/projects/${project.id}`);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Project</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            statuses={statuses}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/projects")}
            loading={loading}
            leads={leads.map((l: any) => ({ id: l.id, name: l.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
