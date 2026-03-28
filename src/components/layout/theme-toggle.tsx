"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!mounted) {
    return (
      <div
        className="h-9 w-9 shrink-0 rounded-lg border border-transparent bg-transparent"
        aria-hidden
      />
    );
  }

  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  const options = [
    { id: "light" as const, label: "Light", icon: Sun },
    { id: "dark" as const, label: "Dark", icon: Moon },
    { id: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors",
          "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        aria-label={`Theme: ${theme === "system" ? "System" : theme}. Open menu`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 min-w-[10rem] rounded-lg border border-border bg-card py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map(({ id, label, icon: OptIcon }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => {
                setTheme(id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-card-foreground transition-colors",
                "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                theme === id && "bg-muted font-medium text-brand-600 dark:text-brand-400"
              )}
            >
              <OptIcon className="h-4 w-4 shrink-0 opacity-70" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
