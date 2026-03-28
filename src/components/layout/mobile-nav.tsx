"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X, Zap } from "lucide-react";
import { useWhiteLabel } from "@/hooks/use-white-label";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/projects", label: "Projects" },
  { href: "/proposals", label: "Proposals" },
  { href: "/tasks", label: "Tasks" },
  { href: "/solar", label: "Solar Analysis" },
  { href: "/equipment", label: "Equipment" },
  { href: "/settings", label: "Settings" },
];

function pathMatchesNav(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const { settings } = useWhiteLabel();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close menu"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="absolute left-0 top-0 flex h-full w-[min(18rem,100vw)] flex-col bg-slate-950 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
      >
        <div className="mb-8 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            {settings.logoUrl ? (
              <Image
                src={settings.logoUrl}
                alt={settings.companyName}
                width={160}
                height={32}
                className="h-8 max-w-[160px] object-contain"
                unoptimized
              />
            ) : (
              <>
                {settings.faviconUrl ? (
                  <Image
                    src={settings.faviconUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-lg object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                )}
                <span className="truncate text-lg font-bold tracking-tight text-white">
                  {settings.companyName === "SolarFlow" ? (
                    <>
                      Solar<span className="text-brand-400">Flow</span>
                    </>
                  ) : (
                    settings.companyName
                  )}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="min-h-11 min-w-11 shrink-0 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close menu"
          >
            <X className="mx-auto h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              className={cn(
                "block min-h-11 rounded-lg px-3 py-2.5 text-sm font-medium leading-6 transition-colors",
                pathMatchesNav(pathname, item.href)
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
