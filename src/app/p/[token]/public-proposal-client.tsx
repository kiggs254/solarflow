"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProposalPresentationData } from "@/lib/public-proposal-dto";
import { ProposalPresentation } from "@/components/proposals/proposal-presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { proposalStatusColor } from "@/lib/utils";

type ApiOk = {
  needsPassword: boolean;
  proposal: ProposalPresentationData | null;
};

export function PublicProposalClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [proposal, setProposal] = useState<ProposalPresentationData | null>(null);
  const [password, setPassword] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockErr, setUnlockErr] = useState<string | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptMsg, setAcceptMsg] = useState<string | null>(null);
  const [acceptErr, setAcceptErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/proposals/${encodeURIComponent(token)}`);
      const data = (await res.json()) as ApiOk & { error?: string };
      if (res.status === 404) {
        setError("This proposal link is invalid or has been disabled.");
        setProposal(null);
        setNeedsPassword(false);
        return;
      }
      if (res.status === 401 && data.needsPassword) {
        setNeedsPassword(true);
        setProposal(null);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not load proposal");
        setProposal(null);
        setNeedsPassword(false);
        return;
      }
      setNeedsPassword(false);
      setProposal(data.proposal);
    } catch {
      setError("Could not load proposal");
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockErr(null);
    setUnlockBusy(true);
    try {
      const res = await fetch(`/api/public/proposals/${encodeURIComponent(token)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUnlockErr(data.error ?? "Could not unlock");
        return;
      }
      setPassword("");
      await load();
    } finally {
      setUnlockBusy(false);
    }
  };

  const accept = async () => {
    setAcceptErr(null);
    setAcceptMsg(null);
    setAcceptBusy(true);
    try {
      const res = await fetch(`/api/public/proposals/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAcceptErr(data.error ?? "Could not accept proposal");
        return;
      }
      if (data.alreadyAccepted) {
        setAcceptMsg("This proposal was already accepted.");
      } else {
        setAcceptMsg("Thank you! Your acceptance has been recorded.");
      }
      await load();
    } finally {
      setAcceptBusy(false);
    }
  };

  const statusKey = proposal?.proposalStatus?.key ?? "";
  const canAccept =
    proposal &&
    statusKey !== "ACCEPTED" &&
    statusKey !== "REJECTED" &&
    statusKey !== "CONVERTED" &&
    statusKey !== "EXPIRED";

  return (
    <div className="space-y-6 pb-24 sm:pb-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Solar proposal</p>
        {proposal && (
          <>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{proposal.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {proposal.proposalStatus && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${proposalStatusColor(proposal.proposalStatus.key)}`}
                >
                  {proposal.proposalStatus.label}
                </span>
              )}
            </div>
          </>
        )}
      </header>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && !loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {needsPassword && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Password required</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Enter the password provided by your solar consultant to view this proposal.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void unlock(e)} className="space-y-3">
              <Input
                id="pp-password"
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {unlockErr && <p className="text-sm text-red-600 dark:text-red-400">{unlockErr}</p>}
              <Button type="submit" disabled={unlockBusy}>
                {unlockBusy ? "Checking…" : "Unlock"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {proposal && !loading && (
        <>
          <ProposalPresentation data={proposal} variant="public" />

          {(acceptMsg || acceptErr) && (
            <p
              className={`text-sm ${acceptErr ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"}`}
            >
              {acceptErr ?? acceptMsg}
            </p>
          )}

          <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur sm:static sm:z-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            {canAccept ? (
              <Button type="button" className="w-full sm:w-auto" size="lg" disabled={acceptBusy} onClick={() => void accept()}>
                {acceptBusy ? "Submitting…" : "Accept proposal"}
              </Button>
            ) : statusKey === "ACCEPTED" ? (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">This proposal has been accepted.</p>
            ) : (
              <p className="text-sm text-muted-foreground">This proposal is no longer open for acceptance online.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
