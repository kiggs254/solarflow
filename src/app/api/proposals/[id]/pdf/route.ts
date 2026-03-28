import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { renderProposalPdfBuffer } from "@/lib/proposal-pdf-buffer";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let buffer: Uint8Array;
  try {
    buffer = await renderProposalPdfBuffer(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposal-${id}.pdf"`,
    },
  });
}
