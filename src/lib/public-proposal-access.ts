import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "sf_pp_access";
const COOKIE_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days

function getSigningSecret(): string {
  return (
    process.env.PROPOSAL_SHARE_COOKIE_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    ""
  );
}

function signPayload(payloadB64: string): string {
  const secret = getSigningSecret();
  if (!secret) throw new Error("AUTH_SECRET or PROPOSAL_SHARE_COOKIE_SECRET is required for public proposals");
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export type PublicProposalCookiePayload = {
  token: string;
  exp: number;
};

/** Encode signed cookie value: base64url(JSON).base64url(hmac) */
export function createPublicProposalCookieValue(token: string): string {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SEC;
  const payload: PublicProposalCookiePayload = { token, exp };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function parsePublicProposalCookie(raw: string | undefined): PublicProposalCookiePayload | null {
  if (!raw || !raw.includes(".")) return null;
  const secret = getSigningSecret();
  if (!secret) return null;
  const [payloadB64, sig] = raw.split(".", 2);
  if (!payloadB64 || !sig) return null;
  try {
    const expected = signPayload(payloadB64);
    const a = Buffer.from(sig, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { token?: string; exp?: number };
    if (typeof parsed.token !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { token: parsed.token, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function appendPublicProposalCookie(res: NextResponse, token: string): void {
  const value = createPublicProposalCookieValue(token);
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SEC,
    path: "/",
  });
}

export function clearPublicProposalCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export function readPublicProposalCookieFromRequest(req: NextRequest): PublicProposalCookiePayload | null {
  const raw = req.cookies.get(COOKIE_NAME)?.value;
  return parsePublicProposalCookie(raw);
}

export function cookiePayloadMatchesToken(payload: PublicProposalCookiePayload | null, token: string): boolean {
  return payload !== null && payload.token === token;
}

/** In-memory rate limit for unlock/accept (per IP) */
const proposalActionBuckets = new Map<string, number[]>();
const ACTION_WINDOW_MS = 60_000;
const ACTION_MAX = 20;

export function checkPublicProposalActionRateLimit(ip: string): boolean {
  const now = Date.now();
  const list = proposalActionBuckets.get(ip) ?? [];
  const fresh = list.filter((t) => now - t < ACTION_WINDOW_MS);
  if (fresh.length >= ACTION_MAX) return false;
  fresh.push(now);
  proposalActionBuckets.set(ip, fresh);
  if (proposalActionBuckets.size > 5000) {
    for (const [k, v] of proposalActionBuckets) {
      const pruned = v.filter((t) => now - t < ACTION_WINDOW_MS);
      if (pruned.length === 0) proposalActionBuckets.delete(k);
      else proposalActionBuckets.set(k, pruned);
    }
  }
  return true;
}
