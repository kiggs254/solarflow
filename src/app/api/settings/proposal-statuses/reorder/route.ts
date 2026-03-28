import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { reorderSchema } from "@/lib/validations";

export async function PUT(req: NextRequest) {
  const session = await auth();
  const denied = requireAdminSession(session);
  if (denied) return denied;

  const body = await req.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orderedIds } = parsed.data;
  const existing = await prisma.proposalStatusOption.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true },
  });
  if (existing.length !== orderedIds.length) {
    return NextResponse.json({ error: "Invalid status id in list" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.proposalStatusOption.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  const data = await prisma.proposalStatusOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({ data });
}
