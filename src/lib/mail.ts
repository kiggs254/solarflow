import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  return Boolean(host && from);
}

function getAppBaseUrl(): string {
  const u =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "http://localhost:3000";
  return u.replace(/\/$/, "");
}

export function createMailTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)?.trim();
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;

  if (!host) {
    throw new Error("SMTP_HOST is not set");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

export type ProposalEmailDefaultsParams = {
  leadName: string;
  proposalTitle: string;
  proposalId: string;
  publicShareToken: string | null;
};

export function getProposalEmailDefaults(params: ProposalEmailDefaultsParams): {
  subject: string;
  bodyPdf: string;
  bodyPublicLink: string;
  crmProposalUrl: string;
  publicProposalUrl: string | null;
} {
  const base = getAppBaseUrl();
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "SolarFlow";
  const crmProposalUrl = `${base}/proposals/${params.proposalId}`;
  const publicProposalUrl = params.publicShareToken
    ? `${base}/p/${params.publicShareToken}`
    : null;

  const subject = `Solar proposal: ${params.proposalTitle}`;

  const bodyPdf = [
    `Hi ${params.leadName},`,
    "",
    `Please find your solar proposal "${params.proposalTitle}" attached as a PDF.`,
    "",
    `You can also view it in our portal (sign-in may be required): ${crmProposalUrl}`,
    "",
    "Thank you,",
    fromName,
  ].join("\n");

  const bodyPublicLink = publicProposalUrl
    ? [
        `Hi ${params.leadName},`,
        "",
        "View your solar proposal online (no login required):",
        "",
        publicProposalUrl,
        "",
        "Thank you,",
        fromName,
      ].join("\n")
    : bodyPdf;

  return {
    subject,
    bodyPdf,
    bodyPublicLink,
    crmProposalUrl,
    publicProposalUrl,
  };
}

function plainTextToEmailHtml(text: string): string {
  const escaped = escapeHtml(text).replace(/\r\n/g, "\n");
  const inner = escaped.split("\n").join("<br/>");
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">${inner}</body></html>`;
}

export type SendProposalEmailParams = {
  to: string;
  subject: string;
  /** Plain text body (HTML is derived on the server for safety) */
  bodyText: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
};

export async function sendProposalEmail(params: SendProposalEmailParams): Promise<void> {
  const from = process.env.SMTP_FROM?.trim();
  if (!from) {
    throw new Error("SMTP_FROM is not set");
  }

  const subject = params.subject.trim().slice(0, 998);
  const bodyText = params.bodyText.trimEnd();
  if (!subject) {
    throw new Error("Subject is required");
  }
  if (!bodyText) {
    throw new Error("Message body is required");
  }

  const html = plainTextToEmailHtml(bodyText);

  const transport = createMailTransport();
  await transport.sendMail({
    from,
    to: params.to,
    subject,
    text: bodyText,
    html,
    attachments: params.attachments?.length ? params.attachments : undefined,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ProposalAcceptedNotifyParams = {
  proposalTitle: string;
  leadName: string;
  /** Optional link back to the public proposal page */
  publicPageUrl?: string;
};

export async function sendProposalAcceptedNotifications(params: ProposalAcceptedNotifyParams): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn("[mail] SMTP not configured; skipping proposal accepted notifications");
    return;
  }

  const recipients = await prisma.user.findMany({
    where: { notifyProposalAccepted: true, email: { not: "" } },
    select: { email: true, name: true },
  });
  if (recipients.length === 0) return;

  const from = process.env.SMTP_FROM?.trim();
  if (!from) {
    console.warn("[mail] SMTP_FROM not set; skipping proposal accepted notifications");
    return;
  }

  const subject = `Proposal accepted: ${params.proposalTitle}`;
  const linkLine = params.publicPageUrl
    ? `Public page: ${params.publicPageUrl}`
    : undefined;

  const text = [
    `A client accepted a proposal.`,
    "",
    `Proposal: ${params.proposalTitle}`,
    `Lead: ${params.leadName}`,
    ...(linkLine ? ["", linkLine] : []),
    "",
    process.env.SMTP_FROM_NAME?.trim() || "SolarFlow",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>A client accepted a proposal.</p>
  <p><strong>${escapeHtml(params.proposalTitle)}</strong><br/>Lead: ${escapeHtml(params.leadName)}</p>
  ${
    params.publicPageUrl
      ? `<p><a href="${escapeHtml(params.publicPageUrl)}">Open public proposal page</a></p>`
      : ""
  }
  <p>— ${escapeHtml(process.env.SMTP_FROM_NAME?.trim() || "SolarFlow")}</p>
</body>
</html>`.trim();

  let transport;
  try {
    transport = createMailTransport();
  } catch (e) {
    console.warn("[mail] Could not create transport for proposal accepted notifications:", e);
    return;
  }

  for (const r of recipients) {
    const to = r.email.trim();
    if (!to) continue;
    try {
      await transport.sendMail({ from, to, subject, text, html });
    } catch (e) {
      console.warn(`[mail] Failed to notify ${to}:`, e);
    }
  }
}
