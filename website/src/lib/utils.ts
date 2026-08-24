import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as a locale string. */
export function fmt(n: number | string | null | undefined, opts?: { prefix?: string; suffix?: string; decimals?: number }) {
  if (n == null) return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return String(n);
  const parts = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: opts?.decimals ?? 2,
    minimumFractionDigits: opts?.decimals ?? 2,
  }).format(num);
  return `${opts?.prefix ?? ""}${parts}${opts?.suffix ?? ""}`;
}

/** Format a number as a locale string without decimals. */
export function fmtInt(n: number | string | null | undefined, opts?: { prefix?: string; suffix?: string }) {
  return fmt(n, { ...opts, decimals: 0 });
}

/** Simple date formatter */
export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

/** Delay helper for simulated typing */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
