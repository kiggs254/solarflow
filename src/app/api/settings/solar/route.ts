import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { solarConfigSchema } from "@/lib/validations";
import { encryptApiKey } from "@/lib/crypto";

const DEFAULT_CONFIG = {
  activeProvider: "GOOGLE",
  fallbackProvider: null as string | null,
  nrelConfigured: false,
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.solarProviderConfig.findUnique({ where: { id: "singleton" } });

  return NextResponse.json({
    activeProvider: config?.activeProvider ?? DEFAULT_CONFIG.activeProvider,
    fallbackProvider: config?.fallbackProvider ?? DEFAULT_CONFIG.fallbackProvider,
    nrelConfigured: Boolean(config?.nrelApiKey),
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = solarConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });
  }

  const { activeProvider, fallbackProvider, nrelApiKey } = parsed.data;

  const data: Record<string, unknown> = {
    activeProvider,
    fallbackProvider: fallbackProvider ?? null,
  };

  if (nrelApiKey) {
    try {
      data.nrelApiKey = encryptApiKey(nrelApiKey);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "SOLAR_ENCRYPTION_KEY is not configured on the server. Set a 64-char hex env var to store NREL keys.",
        },
        { status: 503 }
      );
    }
  }

  const config = await prisma.solarProviderConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data } as Parameters<typeof prisma.solarProviderConfig.create>[0]["data"],
    update: data,
  });

  return NextResponse.json({
    activeProvider: config.activeProvider,
    fallbackProvider: config.fallbackProvider,
    nrelConfigured: Boolean(config.nrelApiKey),
  });
}
