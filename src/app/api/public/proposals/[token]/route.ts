import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  cookiePayloadMatchesToken,
  readPublicProposalCookieFromRequest,
} from "@/lib/public-proposal-access";
import { proposalPublicInclude, toPresentationData, toPublicApiPayload } from "@/lib/public-proposal-dto";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const proposal = await prisma.proposal.findFirst({
    where: { publicShareToken: token },
    ...proposalPublicInclude(),
  });

  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasPassword = Boolean(proposal.publicSharePasswordHash);
  const cookiePayload = readPublicProposalCookieFromRequest(req);
  const unlocked = !hasPassword || cookiePayloadMatchesToken(cookiePayload, token);

  if (!unlocked) {
    return NextResponse.json(toPublicApiPayload(toPresentationData(proposal, "public"), true), {
      status: 401,
    });
  }

  return NextResponse.json(toPublicApiPayload(toPresentationData(proposal, "public"), false));
}
