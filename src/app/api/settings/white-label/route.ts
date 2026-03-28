import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.whiteLabelSettings.findUnique({
    where: { id: "singleton" },
  });

  return NextResponse.json(
    settings ?? {
      id: "singleton",
      logoUrl: null,
      faviconUrl: null,
      themeColor: "#f59e0b",
      companyName: "SolarFlow",
    }
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { themeColor, companyName, logoUrl, faviconUrl } = body;

  const data: Record<string, unknown> = {};
  if (typeof themeColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(themeColor)) {
    data.themeColor = themeColor;
  }
  if (typeof companyName === "string" && companyName.trim()) {
    data.companyName = companyName.trim();
  }
  if (logoUrl === null) data.logoUrl = null;
  if (faviconUrl === null) data.faviconUrl = null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const settings = await prisma.whiteLabelSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data } as any,
    update: data,
  });

  return NextResponse.json(settings);
}
