import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderProposalPdfBuffer } from "@/lib/proposal-pdf-buffer";
import { getProposalEmailDefaults, isSmtpConfigured, sendProposalEmail } from "@/lib/mail";
import { getProposalStatusIdByKey } from "@/lib/workflow-defaults";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      publicShareToken: true,
      lead: { select: { email: true, name: true } },
    },
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email = proposal.lead?.email?.trim();
  const defaults = getProposalEmailDefaults({
    leadName: proposal.lead?.name ?? "there",
    proposalTitle: proposal.title,
    proposalId: proposal.id,
    publicShareToken: proposal.publicShareToken,
  });

  return NextResponse.json({
    smtpConfigured: isSmtpConfigured(),
    hasRecipient: Boolean(email),
    recipientPreview: email ? maskEmail(email) : null,
    hasPublicLink: Boolean(proposal.publicShareToken),
    publicUrl: defaults.publicProposalUrl,
    defaults: {
      subject: defaults.subject,
      bodyPdf: defaults.bodyPdf,
      bodyPublicLink: defaults.bodyPublicLink,
    },
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const show = local.slice(0, 2);
  return `${show}***@${domain}`;
}

const sendBodySchema = z.object({
  mode: z.enum(["pdf", "public_link"]),
  subject: z.string().min(1, "Subject is required").max(998),
  body: z.string().min(1, "Message body is required").max(50_000),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email is not configured. Set SMTP_HOST, SMTP_FROM, and optionally SMTP_PORT, SMTP_USER, SMTP_PASSWORD in your environment.",
      },
      { status: 503 }
    );
  }

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { lead: true, proposalStatus: true },
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const to = proposal.lead?.email?.trim();
  if (!to) {
    return NextResponse.json(
      { error: "This lead has no email address. Add one on the lead record before sending." },
      { status: 400 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mode, subject, body } = parsed.data;

  if (mode === "public_link" && !proposal.publicShareToken) {
    return NextResponse.json(
      {
        error:
          "Public client link is not enabled for this proposal. Open “Client link” and enable a share link before sending the public URL by email.",
      },
      { status: 400 }
    );
  }

  let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined;
  if (mode === "pdf") {
    try {
      const pdfBuffer = await renderProposalPdfBuffer(id);
      attachments = [
        {
          filename: `proposal-${proposal.id.slice(0, 8)}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: "application/pdf",
        },
      ];
    } catch {
      return NextResponse.json({ error: "Could not generate PDF for attachment" }, { status: 500 });
    }
  }

  try {
    await sendProposalEmail({
      to,
      subject,
      bodyText: body,
      attachments,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email";
    console.error("[send-email]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const proposalInclude = {
    lead: { include: { project: true, pipelineStage: true } },
    project: true,
    proposalStatus: true,
    solarPanel: true,
    battery: true,
    inverterRel: true,
  } as const;

  const sentStatusId = await getProposalStatusIdByKey("SENT");
  let updated;
  if (sentStatusId) {
    updated = await prisma.proposal.update({
      where: { id },
      data: { statusId: sentStatusId },
      include: proposalInclude,
    });
  } else {
    updated = await prisma.proposal.findUnique({
      where: { id },
      include: proposalInclude,
    });
  }

  return NextResponse.json({
    success: true,
    proposal: updated,
    statusUpdated: Boolean(sentStatusId),
    ...(sentStatusId
      ? {}
      : {
          warning:
            "Email was sent, but no SENT status exists in Settings → Workflows. Add a proposal status with key SENT to auto-update.",
        }),
  });
}
