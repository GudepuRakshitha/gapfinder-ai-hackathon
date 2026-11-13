import type { StrengthStatus } from "@/backend/types";
import { STATUS_META } from "@/lib/constants";

/** Merge class names, ignoring falsey values. */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatPercent(value: number, digits = 0): string {
  return `${(Math.round(value * 10 ** digits) / 10 ** digits).toFixed(digits)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatMinutes(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded}m`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatDate(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatShortDate(value: string | Date | null | undefined): string {
  return formatDate(value, { month: "short", day: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  for (const [unit, secondsInUnit] of ranges) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return formatter.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return "just now";
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T12:00:00.000Z`).getTime();
  const to = new Date(`${toISO}T12:00:00.000Z`).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function statusForMastery(mastery: number, attempted: number): StrengthStatus {
  if (attempted <= 0) return "not_assessed";
  if (mastery >= 75) return "strong";
  if (mastery >= 50) return "medium";
  return "weak";
}

export function statusMeta(status: StrengthStatus) {
  return STATUS_META[status];
}

export function scoreTone(percentage: number): string {
  if (percentage >= 75) return "text-emerald-600";
  if (percentage >= 50) return "text-amber-600";
  return "text-rose-600";
}

export function scoreRing(percentage: number): string {
  if (percentage >= 75) return "#10b981";
  if (percentage >= 50) return "#f59e0b";
  return "#ef4444";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(value: string, max = 160): string {
  const clean = value.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function percentOf(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function sortBy<T>(
  items: T[],
  selector: (item: T) => number,
  direction: "asc" | "desc" = "desc",
): T[] {
  return [...items].sort((a, b) => {
    const value = selector(a) - selector(b);
    return direction === "asc" ? value : -value;
  });
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
