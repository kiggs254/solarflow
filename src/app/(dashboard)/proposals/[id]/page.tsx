"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  useProposal,
  convertProposalToProject,
  updateProposal,
  sendProposalToClient,
} from "@/hooks/use-proposals";
import { useProposalStatuses } from "@/hooks/use-workflows";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageLoading } from "@/components/ui/loading";
import { formatDate, proposalStatusColor } from "@/lib/utils";
import { ArrowLeft, Download, Link2, Mail } from "lucide-react";
import Link from "next/link";
import { ProposalPresentation } from "@/components/proposals/proposal-presentation";
import { ProposalClientShareCard } from "@/components/proposals/proposal-client-share-card";
import type { ProposalForPublic } from "@/lib/public-proposal-dto";
import { toPresentationData } from "@/lib/public-proposal-dto";

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { proposal, isLoading, mutate } = useProposal(id);
  const { statuses: proposalStatuses } = useProposalStatuses();
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<"pdf" | "public_link">("pdf");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const { data: mailInfo } = useSWR(
    id ? `/api/proposals/${id}/send-email` : null,
    (url) => fetch(url).then((r) => r.json())
  );

  const subjectDef = mailInfo?.defaults?.subject;
  const bodyPdfDef = mailInfo?.defaults?.bodyPdf;
  const bodyLinkDef = mailInfo?.defaults?.bodyPublicLink;

  useEffect(() => {
    if (!emailModalOpen || subjectDef === undefined) return;
    setEmailSubject(subjectDef);
    setEmailBody(emailMode === "pdf" ? (bodyPdfDef ?? "") : (bodyLinkDef ?? ""));
  }, [emailModalOpen, emailMode, subjectDef, bodyPdfDef, bodyLinkDef]);

  const activeProposalStatuses = useMemo(
    () =>
      [...proposalStatuses]
        .filter((s) => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [proposalStatuses]
  );

  if (isLoading || !proposal) return <PageLoading />;

  const handleSendToClient = async () => {
    setSendError(null);
    setSendNotice(null);
    if (!emailSubject.trim() || !emailBody.trim()) {
      setSendError("Subject and message are required.");
      return;
    }
    setSendLoading(true);
    try {
      const result = await sendProposalToClient(id, {
        mode: emailMode,
        subject: emailSubject.trim(),
        body: emailBody,
      });
      await mutate();
      if (result.warning) setSendNotice(result.warning);
      setEmailModalOpen(false);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Could not send email");
    } finally {
      setSendLoading(false);
    }
  };

  const leadHasProject = !!proposal.lead?.project;
  const alreadyLinked = !!proposal.projectId;
  const blockedByStatus = !!proposal.proposalStatus?.blocksConversion;
  const canConvertToProject = !leadHasProject && !alreadyLinked && !blockedByStatus;

  const handleConvert = async () => {
    setConvertError(null);
    setConverting(true);
    try {
      const { project } = await convertProposalToProject(id);
      await mutate();
      router.push(`/projects/${project.id}`);
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  const handleStatusChange = async (statusId: string) => {
    if (!statusId || statusId === proposal.statusId) return;
    setStatusError(null);
    setStatusUpdating(true);
    try {
      await updateProposal(id, { statusId });
      await mutate();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const disabledConvertTitle = leadHasProject
    ? "This lead already has a project (one project per lead)."
    : alreadyLinked
      ? "This proposal is already linked to a project."
      : blockedByStatus
        ? "This proposal’s status does not allow conversion."
        : undefined;

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/proposals"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground">{proposal.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                For {proposal.lead?.name} &middot; {formatDate(proposal.createdAt)}
              </p>
              {proposal.proposalStatus && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${proposalStatusColor(proposal.proposalStatus.key)}`}
                >
                  {proposal.proposalStatus.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status & workflow</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Status, exports, and optional email or public link — use the actions below.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeProposalStatuses.length > 0 ? (
            <Select
              id="proposal-status"
              label="Current status"
              disabled={statusUpdating}
              options={activeProposalStatuses.map((s) => ({ label: s.label, value: s.id }))}
              value={proposal.statusId}
              onChange={(e) => void handleStatusChange(e.target.value)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No proposal statuses configured.</p>
          )}
          {statusError && <p className="text-sm text-red-600 dark:text-red-400">{statusError}</p>}

          <div className="border-t border-border/80 pt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Actions
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {canConvertToProject ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void handleConvert()} disabled={converting}>
                  {converting ? "Creating…" : "Convert to project"}
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled title={disabledConvertTitle}>
                  {leadHasProject
                    ? "Lead has project"
                    : alreadyLinked
                      ? "Linked to project"
                      : blockedByStatus
                        ? "Status blocks conversion"
                        : "Convert to project"}
                </Button>
              )}
              <a href={`/api/proposals/${id}/pdf`}>
                <Button variant="outline" size="sm" type="button">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                </Button>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSendError(null);
                  setSendNotice(null);
                  setEmailMode("pdf");
                  setEmailModalOpen(true);
                }}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                Email
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-foreground"
                onClick={() => setLinkModalOpen(true)}
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                Client link
              </Button>
            </div>
            {convertError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{convertError}</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Send proposal by email"
        className="max-w-xl"
      >
        <div className="space-y-4">
          {mailInfo && !mailInfo.smtpConfigured && (
            <p className="text-sm text-brand-800 dark:text-brand-200">
              SMTP is not configured. Add{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">SMTP_HOST</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">SMTP_FROM</code>, and related variables to your server
              environment.
            </p>
          )}
          {proposal.lead?.email?.trim() ? (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Recipient:</span>{" "}
              <span className="font-medium">{proposal.lead.email.trim()}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This lead has no email.{" "}
              <Link
                href={`/leads/${proposal.leadId}`}
                className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                onClick={() => setEmailModalOpen(false)}
              >
                Edit the lead
              </Link>{" "}
              to add one.
            </p>
          )}

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-foreground">Include</legend>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 has-[:checked]:border-brand-500/50 has-[:checked]:bg-brand-500/5">
              <input
                type="radio"
                name="email-mode"
                className="mt-0.5"
                checked={emailMode === "pdf"}
                onChange={() => setEmailMode("pdf")}
              />
              <span>
                <span className="text-sm font-medium text-foreground">PDF attachment</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Proposal attached as a PDF file.
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 has-[:checked]:border-brand-500/50 has-[:checked]:bg-brand-500/5 ${
                !mailInfo?.hasPublicLink ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <input
                type="radio"
                name="email-mode"
                className="mt-0.5"
                checked={emailMode === "public_link"}
                disabled={!mailInfo?.hasPublicLink}
                onChange={() => setEmailMode("public_link")}
              />
              <span>
                <span className="text-sm font-medium text-foreground">Public client link</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {mailInfo?.hasPublicLink
                    ? "No attachment — email points to the shareable /p/… page (password applies if set)."
                    : "Enable a client link first (Client link action), then you can send this option."}
                </span>
              </span>
            </label>
          </fieldset>

          <Input
            id="email-subject"
            label="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Email subject"
          />
          <Textarea
            id="email-body"
            label="Message"
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={10}
            placeholder="Email body"
            className="min-h-[180px] font-mono text-xs sm:text-sm"
          />

          {sendError && <p className="text-sm text-red-600 dark:text-red-400">{sendError}</p>}
          {sendNotice && <p className="text-sm text-brand-800 dark:text-brand-200">{sendNotice}</p>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSendToClient()}
              disabled={
                sendLoading ||
                !mailInfo?.smtpConfigured ||
                !proposal.lead?.email?.trim() ||
                !emailSubject.trim() ||
                !emailBody.trim()
              }
            >
              {sendLoading ? "Sending…" : "Send email"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Client link" className="max-w-lg">
        <ProposalClientShareCard
          proposalId={id}
          publicShareToken={proposal.publicShareToken ?? null}
          publicShareHasPassword={Boolean(proposal.publicShareHasPassword)}
          onUpdated={() => void mutate()}
          forModal
        />
      </Dialog>

      <ProposalPresentation
        data={toPresentationData(proposal as unknown as ProposalForPublic, "crm")}
        variant="crm"
      />
    </div>
  );
}
