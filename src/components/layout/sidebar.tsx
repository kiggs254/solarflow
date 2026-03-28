"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  CheckSquare,
  Sun,
  Cpu,
  Settings,
  LogOut,
  Zap,
  ChevronLeft,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useWhiteLabel } from "@/hooks/use-white-label";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/solar", label: "Solar Analysis", icon: Sun },
  { href: "/equipment", label: "Equipment", icon: Cpu },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { settings } = useWhiteLabel();

  const faviconLogo = settings.faviconUrl ? (
    <Image src={settings.faviconUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" unoptimized />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
      <Zap className="h-5 w-5 text-white" />
    </div>
  );

  const fullLogo = settings.logoUrl ? (
    <Image src={settings.logoUrl} alt={settings.companyName} width={160} height={32} className="h-8 max-w-[140px] object-contain" unoptimized />
  ) : (
    <span className="text-lg font-bold tracking-tight">
      {settings.companyName === "SolarFlow" ? (
        <>Solar<span className="text-brand-400">Flow</span></>
      ) : (
        settings.companyName
      )}
    </span>
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-slate-800 bg-slate-950 text-white transition-all duration-300 lg:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-4">
        {collapsed ? faviconLogo : (
          <>
            {!settings.logoUrl && faviconLogo}
            {fullLogo}
          </>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
            collapsed && "ml-0"
          )}
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-2 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
