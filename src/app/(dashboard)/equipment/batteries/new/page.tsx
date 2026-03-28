"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBattery } from "@/hooks/use-equipment";
import { BatteryForm } from "@/components/equipment/battery-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function NewBatteryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/equipment" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New battery</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <BatteryForm
            loading={loading}
            onCancel={() => router.push("/equipment")}
            onSubmit={async (data) => {
              setLoading(true);
              try {
                await createBattery(data);
                router.push("/equipment");
              } finally {
                setLoading(false);
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
