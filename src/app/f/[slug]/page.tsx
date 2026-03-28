import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseFormFieldsJson, sortFormFields } from "@/lib/lead-forms";
import { PublicLeadForm } from "@/components/forms/public-lead-form";

export default async function PublicLeadCapturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await prisma.leadCaptureForm.findFirst({
    where: { slug: slug.toLowerCase(), isActive: true },
  });
  if (!form) notFound();

  const fields = sortFormFields(parseFormFieldsJson(form.fields));

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
      <p className="mb-6 text-center text-xs text-muted-foreground">
        Powered by <span className="font-semibold text-foreground">SolarFlow</span>
      </p>
      <PublicLeadForm
        formId={form.id}
        name={form.name}
        description={form.description}
        brandColor={form.brandColor ?? "#f59e0b"}
        successMessage={form.successMessage}
        fields={fields}
      />
    </div>
  );
}
