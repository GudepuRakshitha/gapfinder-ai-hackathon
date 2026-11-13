"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { AuthSession } from "@/backend/types";
import {
  BookOpenCheck,
  CalendarCheck,
  ClipboardCheck,
  Cloud,
  Database,
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  MessageCircleQuestion,
  ScanSearch,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { NAV_ITEMS, PAGE_META } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { Badge, Button } from "@/components/ui";

const ICONS = {
  LayoutDashboard,
  FileText,
  Layers,
  ClipboardCheck,
  ScanSearch,
  CalendarCheck,
  TrendingUp,
  MessageCircleQuestion,
  UserRound,
} as const;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="group flex items-center gap-2.5">
      <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm shadow-indigo-600/25 transition group-hover:scale-105">
        <Sparkles className="h-4.5 w-4.5" />
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-tight text-slate-900">
            GapFinder AI
          </span>
          <span className="block text-[10px] font-medium text-slate-400">
            Find what you don&apos;t know
          </span>
        </span>
      ) : null}
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = ["Learn", "Insights", "About"] as const;

  return (
    <nav className="space-y-5" aria-label="Main navigation">
      {groups.map((group) => (
        <div key={group}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {group}
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
              const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Layers;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-indigo-50 font-semibold text-indigo-700"
                        : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition",
                        active
                          ? "text-indigo-600"
                          : "text-slate-400 group-hover:text-slate-600",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ session }: { session: AuthSession }) {
  return (
    <div className="space-y-3 border-t border-slate-200/80 pt-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <Database className="h-3 w-3" />
          Environment
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={session.mode === "supabase" ? "success" : "warning"} icon={session.mode === "supabase" ? Cloud : Database}>
            {session.mode === "supabase" ? "Supabase" : "Local storage"}
          </Badge>
          <Badge tone={session.groqConfigured ? "brand" : "neutral"} icon={Sparkles}>
            {session.groqConfigured ? "Groq AI" : "AI fallback"}
          </Badge>
        </div>
        {!session.groqConfigured ? (
          <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
            <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
            Add GROQ_API_KEY for generated explanations. Everything else still works.
          </p>
        ) : null}
      </div>
      {session.student.isDemo ? (
        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-800">
            <UserRound className="h-3 w-3" /> Demo workspace
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-indigo-700/80">
            Sample materials and quizzes are labelled. Nothing here is a mocked
            score.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Shell({ children, session }: { children: React.ReactNode; session: AuthSession }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, loggingOut, student } = useAuth();
  const meta = PAGE_META[pathname] ?? {
    title: "GapFinder AI",
    subtitle: "",
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-white px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className="mt-8 flex-1 overflow-y-auto pr-1">
          <NavList />
        </div>
        <SidebarFooter session={session} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="animate-slide-up absolute inset-y-0 left-0 flex w-72 flex-col bg-white px-4 py-5 shadow-2xl">
            <div className="flex items-center justify-between px-2">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-7 flex-1 overflow-y-auto">
              <NavList onNavigate={() => setMobileOpen(false)} />
            </div>
            <SidebarFooter session={session} />
          </aside>
        </div>
      ) : null}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 border-b border-slate-200/70 bg-[#f7f7fb]/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:text-slate-800 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {meta.title}
              </p>
              <p className="hidden truncate text-[11px] text-slate-500 sm:block">
                {meta.subtitle}
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Badge tone={session.groqConfigured ? "brand" : "neutral"} icon={Sparkles}>
                {session.groqConfigured ? session.groqModel : "Rule-based fallback"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1.5 shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                {initials(student.fullName || student.email)}
              </span>
              <span className="hidden max-w-[120px] truncate text-xs font-medium text-slate-700 sm:block">
                {student.fullName || student.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                loading={loggingOut}
                className="px-2!"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <footer className="no-print mx-auto w-full max-w-7xl px-4 pb-8 text-center text-[11px] text-slate-400 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5">
            <BookOpenCheck className="h-3 w-3" /> GapFinder AI · built for the iGebra.ai AI Intern Hackathon 2026
          </span>
        </footer>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: AuthSession;
}) {
  return (
    <AuthProvider session={session}>
      <Shell session={session}>{children}</Shell>
    </AuthProvider>
  );
}
