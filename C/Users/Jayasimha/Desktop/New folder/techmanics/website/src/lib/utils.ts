import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as a locale string. */
export function fmt(n: number | string | null | undefined, opts?: { prefix?: string; suffix?: string }) {
  if (n == null) return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return String(n);
  const parts = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
  return `${opts?.prefix ?? ""}${parts}${opts?.suffix ?? ""}`;
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
