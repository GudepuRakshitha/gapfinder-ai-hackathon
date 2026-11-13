"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  push: (tone: ToastTone, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_META: Record<
  ToastTone,
  { icon: typeof Info; className: string; iconClassName: string }
> = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-white",
    iconClassName: "text-emerald-500",
  },
  error: {
    icon: AlertTriangle,
    className: "border-rose-200 bg-white",
    iconClassName: "text-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-200 bg-white",
    iconClassName: "text-amber-500",
  },
  info: {
    icon: Info,
    className: "border-indigo-200 bg-white",
    iconClassName: "text-indigo-500",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { id, tone, title, description }]);
      window.setTimeout(() => remove(id), 5200);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      info: (title, description) => push("info", title, description),
      warning: (title, description) => push("warning", title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2 sm:left-auto sm:right-6 sm:items-end"
      >
        {toasts.map((toast) => {
          const meta = TONE_META[toast.tone];
          const Icon = meta.icon;
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-slate-900/5 animate-slide-up",
                meta.className,
              )}
              role="status"
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", meta.iconClassName)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}
