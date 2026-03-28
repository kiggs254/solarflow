"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, Bell, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useNotifications } from "@/hooks/use-notifications";
import { TaskReminderModal } from "@/components/notifications/task-reminder-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const { data: session } = useSession();
  const { notifications, unreadCount, activeReminders, markRead, markAllRead, dismissReminder, dismissAllReminders } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notifOpen]);

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-border bg-card/80 px-3 py-2 backdrop-blur-sm sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0 dark:bg-card/90">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="relative min-w-0 flex-1 max-sm:min-w-[40%]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className="h-10 w-full min-w-0 rounded-lg border border-input bg-muted py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-9 sm:max-w-xs md:max-w-sm lg:max-w-md"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-9 sm:w-9"
            aria-expanded={notifOpen}
            aria-haspopup="true"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-border bg-card py-2 shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-3 pb-2">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                {unreadCount > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void markAllRead()}>
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
                ) : (
                  notifications.map((n) => {
                    const inner = (
                      <div
                        className={cn(
                          "border-b border-border/80 px-3 py-2.5 transition-colors last:border-0",
                          !n.read && "bg-brand-500/5"
                        )}
                      >
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                      </div>
                    );
                    if (n.link) {
                      return (
                        <Link
                          key={n.id}
                          href={n.link}
                          onClick={() => {
                            if (!n.read) void markRead(n.id);
                            setNotifOpen(false);
                          }}
                          className="block hover:bg-muted/80"
                        >
                          {inner}
                        </Link>
                      );
                    }
                    return (
                      <button
                        key={n.id}
                        type="button"
                        className="block w-full text-left hover:bg-muted/80"
                        onClick={() => {
                          if (!n.read) void markRead(n.id);
                        }}
                      >
                        {inner}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-orange-500 text-sm font-semibold text-white">
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{session?.user?.name ?? "User"}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {(session?.user as { role?: string })?.role?.toLowerCase().replace("_", " ") ?? ""}
            </p>
          </div>
        </div>
      </div>

      <TaskReminderModal
        reminders={activeReminders}
        onDismiss={dismissReminder}
        onDismissAll={dismissAllReminders}
      />
    </header>
  );
}
