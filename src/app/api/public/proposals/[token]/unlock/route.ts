import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  appendPublicProposalCookie,
  checkPublicProposalActionRateLimit,
} from "@/lib/public-proposal-access";
import { clientIpFromRequest } from "@/lib/lead-forms";

const bodySchema = z.object({
  password: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip = clientIpFromRequest(req);
  if (!checkPublicProposalActionRateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const proposal = await prisma.proposal.findFirst({
    where: { publicShareToken: token },
    select: { id: true, publicSharePasswordHash: true },
  });

  if (!proposal?.publicSharePasswordHash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ok = await bcrypt.compare(parsed.data.password, proposal.publicSharePasswordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  appendPublicProposalCookie(res, token);
  return res;
}
