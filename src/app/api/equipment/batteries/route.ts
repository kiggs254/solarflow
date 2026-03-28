import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { batteryEquipmentSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const batteries = await prisma.battery.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ manufacturer: "asc" }, { model: "asc" }],
  });

  return NextResponse.json({ data: batteries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = batteryEquipmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const battery = await prisma.battery.create({ data: parsed.data });
  return NextResponse.json(battery, { status: 201 });
}
