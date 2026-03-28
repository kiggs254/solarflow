import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const after = searchParams.get("after");

  const where: {
    userId: string;
    read?: boolean;
    createdAt?: { gt: Date };
  } = { userId: session.user.id };
  if (unreadOnly) where.read = false;
  if (after) {
    const d = new Date(after);
    if (!Number.isNaN(d.getTime())) where.createdAt = { gt: d };
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return NextResponse.json({ data: notifications, unreadCount });
}
