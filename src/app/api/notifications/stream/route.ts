import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processDueTaskReminders } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 5000;
const MAX_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  let lastCursor = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (obj: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* stream closed */
        }
      };

      send({ type: "connected", at: new Date().toISOString() });

      const tick = async () => {
        try {
          await processDueTaskReminders();
          const fresh = await prisma.notification.findMany({
            where: {
              userId,
              createdAt: { gt: lastCursor },
            },
            orderBy: { createdAt: "asc" },
          });
          if (fresh.length > 0) {
            lastCursor = fresh[fresh.length - 1]!.createdAt;
            send({ type: "notifications", notifications: fresh });
          }
          send({ type: "ping", t: Date.now() });
        } catch (e) {
          send({ type: "error", message: String(e) });
        }
      };

      const interval = setInterval(() => void tick(), POLL_MS);
      void tick();

      const stop = () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* ok */
        }
      };

      const killTimer = setTimeout(stop, MAX_MS);
      req.signal.addEventListener("abort", () => {
        clearTimeout(killTimer);
        stop();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
