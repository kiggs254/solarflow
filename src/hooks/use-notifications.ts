"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function playNotificationChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
    setTimeout(() => void ctx.close(), 400);
  } catch {
    try {
      const a = new Audio("/sounds/notification.mp3");
      void a.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }
}

export function useNotifications() {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeReminders, setActiveReminders] = useState<AppNotification[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const r = await fetch("/api/notifications?limit=40");
    if (!r.ok) return;
    const j = (await r.json()) as { data: AppNotification[]; unreadCount: number };
    setNotifications(j.data ?? []);
    setUnreadCount(j.unreadCount ?? 0);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    void refresh();
  }, [status, refresh]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const connect = () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      const es = new EventSource("/api/notifications/stream");
      esRef.current = es;
      es.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data) as {
            type?: string;
            notifications?: AppNotification[];
          };
          if (
            d.type === "notifications" &&
            Array.isArray(d.notifications) &&
            d.notifications.length > 0
          ) {
            const incoming = d.notifications;

            const reminders = incoming.filter(
              (n) => n.type === "TASK_REMINDER" && !n.read && !dismissedRef.current.has(n.id)
            );
            if (reminders.length > 0) {
              setActiveReminders((prev) => {
                const ids = new Set(prev.map((x) => x.id));
                return [...prev, ...reminders.filter((r) => !ids.has(r.id))];
              });
            }

            const nonReminders = incoming.filter((n) => n.type !== "TASK_REMINDER");
            if (nonReminders.length > 0) {
              playNotificationChime();
            }

            setNotifications((prev) => {
              const ids = new Set(prev.map((x) => x.id));
              const merged = [...incoming.filter((n) => !ids.has(n.id)), ...prev];
              return merged.slice(0, 50);
            });
            setUnreadCount((c) => c + incoming.filter((n) => !n.read).length);
          }
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        es.close();
        esRef.current = null;
        reconnectRef.current = setTimeout(() => {
          connect();
        }, 4000);
      };
    };

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [status]);

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    setNotifications((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
  }, []);

  const dismissReminder = useCallback(
    async (id: string) => {
      dismissedRef.current.add(id);
      setActiveReminders((prev) => prev.filter((n) => n.id !== id));
      await markRead(id);
    },
    [markRead]
  );

  const dismissAllReminders = useCallback(async () => {
    const ids = activeReminders.map((n) => n.id);
    ids.forEach((id) => dismissedRef.current.add(id));
    setActiveReminders([]);
    await Promise.all(ids.map((id) => markRead(id)));
  }, [activeReminders, markRead]);

  return {
    notifications,
    unreadCount,
    activeReminders,
    markRead,
    markAllRead,
    dismissReminder,
    dismissAllReminders,
    refresh,
  };
}
