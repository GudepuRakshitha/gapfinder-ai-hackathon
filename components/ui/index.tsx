import type { ComponentType, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "soft";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
    size === "sm" && "px-3 py-1.5 text-xs",
    size === "md" && "px-4 py-2.5 text-sm",
    size === "lg" && "px-5 py-3 text-sm",
    variant === "primary" &&
      "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:bg-indigo-800",
    variant === "secondary" &&
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
    variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    variant === "danger" &&
      "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    variant === "soft" && "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    className,
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className,
  type = "button",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className,
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Component
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]",
        className,
      )}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

export type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  outline: "bg-white text-slate-600 ring-slate-200",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  icon: Icon,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        BADGE_TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Alert                                                                      */
/* -------------------------------------------------------------------------- */

export type AlertTone = "info" | "warning" | "error" | "success";

const ALERT_TONES: Record<AlertTone, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  icon: Icon,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        ALERT_TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" /> : null}
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className="text-xs leading-relaxed opacity-90">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Progress bar                                                               */
/* -------------------------------------------------------------------------- */

export function ProgressBar({
  value,
  className,
  tone,
  label,
}: {
  value: number;
  className?: string;
  tone?: "brand" | "success" | "warning" | "danger";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const color =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-rose-500"
          : clamped >= 75
            ? "bg-emerald-500"
            : clamped >= 50
              ? "bg-amber-500"
              : "bg-rose-500";
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page header                                                                */
/* -------------------------------------------------------------------------- */

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat card                                                                  */
/* -------------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: "brand" | "success" | "warning" | "danger" | "neutral";
  trend?: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "warning"
        ? "bg-amber-50 text-amber-600"
        : tone === "danger"
          ? "bg-rose-50 text-rose-600"
          : tone === "neutral"
            ? "bg-slate-100 text-slate-600"
            : "bg-indigo-50 text-indigo-600";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
        </div>
        {Icon ? (
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneClass)}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
      </div>
      {trend ? <div className="mt-2">{trend}</div> : null}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state / skeleton / spinner                                           */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-indigo-600", className)} />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-sm text-slate-500">
      <Spinner />
      {label}
    </div>
  );
}
