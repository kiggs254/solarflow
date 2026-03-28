import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkPublicProposalActionRateLimit,
  cookiePayloadMatchesToken,
  readPublicProposalCookieFromRequest,
} from "@/lib/public-proposal-access";
import { clientIpFromRequest } from "@/lib/lead-forms";
import { sendProposalAcceptedNotifications } from "@/lib/mail";
import { notifyProposalAcceptedInApp } from "@/lib/notifications";

const BLOCK_ACCEPT_KEYS = new Set(["REJECTED", "CONVERTED", "EXPIRED"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip = clientIpFromRequest(req);
  if (!checkPublicProposalActionRateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  const proposal = await prisma.proposal.findFirst({
    where: { publicShareToken: token },
    include: {
      proposalStatus: { select: { key: true } },
      lead: { select: { name: true } },
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (proposal.publicSharePasswordHash) {
    const payload = readPublicProposalCookieFromRequest(req);
    if (!cookiePayloadMatchesToken(payload, token)) {
      return NextResponse.json({ error: "Password required" }, { status: 401 });
    }
  }

  const statusKey = proposal.proposalStatus?.key ?? "";
  if (BLOCK_ACCEPT_KEYS.has(statusKey)) {
    return NextResponse.json(
      { error: "This proposal can no longer be accepted online." },
      { status: 400 }
    );
  }

  if (statusKey === "ACCEPTED") {
    return NextResponse.json({ success: true, alreadyAccepted: true });
  }

  const proposalId = proposal.id;

  const accepted = await prisma.proposalStatusOption.findFirst({
    where: { key: "ACCEPTED", isActive: true },
  });
  if (!accepted) {
    return NextResponse.json({ error: "Accepted status is not configured." }, { status: 500 });
  }

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { statusId: accepted.id },
  });

  try {
    await notifyProposalAcceptedInApp({
      proposalTitle: proposal.title,
      leadName: proposal.lead?.name ?? "Customer",
      proposalId,
    });
  } catch (e) {
    console.warn("[accept] in-app notification failed:", e);
  }

  try {
    await sendProposalAcceptedNotifications({
      proposalTitle: proposal.title,
      leadName: proposal.lead?.name ?? "Customer",
      publicPageUrl: `${getOriginFromRequest(req)}/p/${encodeURIComponent(token)}`,
    });
  } catch (e) {
    console.warn("[accept] notification mail skipped or failed:", e);
  }

  return NextResponse.json({ success: true });
}

function getOriginFromRequest(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
