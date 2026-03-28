"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Copy, Trash2, RefreshCw } from "lucide-react";

type Props = {
  proposalId: string;
  publicShareToken: string | null;
  publicShareHasPassword: boolean;
  onUpdated: () => void;
  /** Omit outer Card; muted panel for use inside another card */
  embedded?: boolean;
  /** Content only, for use inside a Dialog */
  forModal?: boolean;
};

export function ProposalClientShareCard({
  proposalId,
  publicShareToken,
  publicShareHasPassword,
  onUpdated,
  embedded = false,
  forModal = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [copyDone, setCopyDone] = useState(false);

  const publicUrl =
    typeof window !== "undefined" && publicShareToken
      ? `${window.location.origin}/p/${encodeURIComponent(publicShareToken)}`
      : "";

  const postShare = async (body: object) => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/public-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      onUpdated();
      setPasswordInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const disableShare = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/public-share`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  };

  const applyPassword = async () => {
    if (!passwordInput.trim()) {
      setError("Enter a password or use Remove password");
      return;
    }
    await postShare({ password: passwordInput.trim() });
  };

  const removePassword = async () => {
    await postShare({ password: null });
  };

  const body = (
    <div className="space-y-3">
      {publicShareToken ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="block max-w-full flex-1 truncate rounded-md border border-border/80 bg-background/50 px-2 py-1.5 text-[11px] text-muted-foreground">
              {publicUrl || "…"}
            </code>
            <Button type="button" variant="ghost" size="sm" onClick={() => void copyUrl()} disabled={busy}>
              <Copy className="mr-1 h-3.5 w-3.5" />
              {copyDone ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Password lock: {publicShareHasPassword ? "on" : "off"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              disabled={busy}
              onClick={() => void postShare({ regenerate: true })}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Regenerate
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => void disableShare()}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Disable
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" variant="outline" size="sm" className="font-normal" disabled={busy} onClick={() => void postShare({})}>
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Enable public link
        </Button>
      )}

      {publicShareToken && (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-[11px] font-medium text-muted-foreground">Optional page password</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                id={forModal ? "share-password-modal" : embedded ? "share-password-embedded" : "share-password"}
                label={publicShareHasPassword ? "New password" : "Password"}
                type="password"
                autoComplete="new-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void applyPassword()}>
              Save
            </Button>
          </div>
          {publicShareHasPassword && (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-muted-foreground" disabled={busy} onClick={() => void removePassword()}>
              Remove password
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );

  if (forModal) {
    return <div className="space-y-4">{body}</div>;
  }

  if (embedded) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 sm:p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Link2 className="h-3.5 w-3.5 opacity-70" />
          Client link
        </p>
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          Read-only page for your customer. Optional password.
        </p>
        {body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-brand-600" />
          Client link
        </CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Share a read-only proposal page with your customer. Optionally protect it with a password.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}
