"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppNotification } from "@/hooks/use-notifications";

/**
 * Generates a continuous alarm tone using Web Audio API.
 * Returns a stop function. The alarm alternates between two frequencies
 * with a pulsing gain envelope so it sounds urgent but not ear-splitting.
 */
function startAlarmLoop(): () => void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(ctx.destination);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 4;
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();

    const osc1 = ctx.createOscillator();
    osc1.type = "square";
    osc1.frequency.value = 880;
    osc1.connect(masterGain);
    osc1.start();

    const osc2 = ctx.createOscillator();
    osc2.type = "square";
    osc2.frequency.value = 660;
    osc2.connect(masterGain);
    osc2.start();

    const toggle = setInterval(() => {
      const now = ctx.currentTime;
      osc1.frequency.setValueAtTime(osc1.frequency.value === 880 ? 660 : 880, now);
      osc2.frequency.setValueAtTime(osc2.frequency.value === 660 ? 880 : 660, now);
    }, 600);

    return () => {
      clearInterval(toggle);
      try {
        osc1.stop();
        osc2.stop();
        lfo.stop();
        void ctx.close();
      } catch {
        /* already closed */
      }
    };
  } catch {
    return () => {};
  }
}

interface TaskReminderModalProps {
  reminders: AppNotification[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export function TaskReminderModal({ reminders, onDismiss, onDismissAll }: TaskReminderModalProps) {
  const router = useRouter();
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (reminders.length === 0) {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
      return;
    }

    if (!stopRef.current) {
      stopRef.current = startAlarmLoop();
    }

    return () => {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    };
  }, [reminders.length]);

  const handleGo = useCallback(
    (n: AppNotification) => {
      onDismiss(n.id);
      if (n.link) router.push(n.link);
    },
    [onDismiss, router]
  );

  if (reminders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md animate-bounce-slow rounded-2xl border-2 border-brand-500 bg-card shadow-2xl shadow-brand-500/20">
        {/* pulsing ring */}
        <div className="absolute -inset-1 animate-pulse rounded-2xl border-2 border-brand-400/40" />

        <div className="relative p-6">
          {/* header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/15">
              <Bell className="h-6 w-6 animate-wiggle text-brand-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">Task Reminder</h2>
              <p className="text-xs text-muted-foreground">
                {reminders.length === 1
                  ? "You have a task due"
                  : `You have ${reminders.length} tasks due`}
              </p>
            </div>
            {reminders.length > 1 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onDismissAll}>
                Dismiss all
              </Button>
            )}
          </div>

          {/* reminder list */}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {reminders.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-3"
              >
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {n.link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleGo(n)}
                    >
                      View
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDismiss(n.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* dismiss button */}
          <Button
            className="mt-5 w-full bg-brand-500 text-white hover:bg-brand-600"
            onClick={onDismissAll}
          >
            {reminders.length === 1 ? "Dismiss" : "Dismiss all"}
          </Button>
        </div>
      </div>
    </div>
  );
}
