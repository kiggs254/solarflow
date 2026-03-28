import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

/** URL slug: lowercase, hyphens */
export function slugifyHyphen(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "form";
}

/** Custom form field key: lowercase snake_case */
export function labelToFieldKey(label: string): string {
  const s = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || "custom_field";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number, decimals = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    NEW_LEAD: "New Lead",
    QUALIFIED: "Qualified",
    PROPOSAL_GENERATED: "Proposal Generated",
    NEGOTIATION: "Negotiation",
    WON: "Won",
    LOST: "Lost",
  };
  return labels[stage] ?? stage;
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    DESIGN: "Design",
    APPROVAL: "Approval",
    INSTALLATION: "Installation",
    COMPLETED: "Completed",
  };
  return labels[status] ?? status;
}

export function stageColor(stage: string): string {
  const colors: Record<string, string> = {
    NEW_LEAD: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    QUALIFIED: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
    PROPOSAL_GENERATED: "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
    NEGOTIATION: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    WON: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    LOST: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  };
  return colors[stage] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    DESIGN: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    APPROVAL: "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
    INSTALLATION: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
    COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

export function proposalStatusColor(key: string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
    SENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    NEGOTIATION: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    ACCEPTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    EXPIRED: "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
    CONVERTED: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  };
  return colors[key] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}
