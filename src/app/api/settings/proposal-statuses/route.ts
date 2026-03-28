import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { proposalStatusUpsertSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await prisma.proposalStatusOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const body = await req.json();
  const parsed = proposalStatusUpsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const maxOrder = await prisma.proposalStatusOption.aggregate({ _max: { sortOrder: true } });
  const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  try {
    const row = await prisma.proposalStatusOption.create({
      data: {
        key: parsed.data.key,
        label: parsed.data.label,
        sortOrder,
        isActive: parsed.data.isActive ?? true,
        blocksConversion: parsed.data.blocksConversion ?? false,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    const dup = e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002";
    return NextResponse.json({ error: dup ? "Key already exists" : "Failed to create status" }, { status: 400 });
  }
}
