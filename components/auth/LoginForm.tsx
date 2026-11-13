"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppStatus, AuthSession } from "@/backend/types";
import { api, errorToMessage } from "@/lib/api";
import { DEMO_CREDENTIALS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buttonClasses, Alert, Badge } from "@/components/ui";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type Mode = "login" | "signup";

export function LoginForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AppStatus>("/api/status")
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setConfirmation(null);
  };

  const fillDemo = () => {
    setMode("login");
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setConfirmation(null);
    try {
      if (mode === "login") {
        await api.post<AuthSession>("/api/auth/login", { email, password });
        toast.success("Welcome back", "Loading your learning dashboard.");
        router.replace("/dashboard");
        router.refresh();
      } else {
        const result = await api.post<{
          session: AuthSession | null;
          requiresConfirmation: boolean;
        }>("/api/auth/signup", { email, password, fullName });
        if (result.session) {
          toast.success("Account created", "Your workspace is ready.");
          router.replace("/dashboard");
          router.refresh();
        } else {
          setConfirmation(
            "Account created. Confirm your email address, then sign in. For a hackathon demo you can disable email confirmation in Supabase Auth settings.",
          );
          setMode("login");
          setPassword("");
        }
      }
    } catch (caught) {
      setError(errorToMessage(caught, "Could not sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mesh-background flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm shadow-indigo-600/25">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight text-slate-900">
              GapFinder AI
            </span>
            <span className="block text-[10px] font-medium text-slate-500">
              Find what you don&apos;t know
            </span>
          </span>
        </Link>
        <Link href="/" className={buttonClasses("ghost", "sm")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-2 lg:py-12">
        <div className="hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm">
            <GraduationCap className="h-3 w-3" /> Your study loop, grounded
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900">
            Know exactly what
            <span className="brand-text-gradient block">to study next.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
            Sign in to upload your material, take a diagnostic quiz generated
            from your own content, and get a revision plan built around your
            real gaps.
          </p>

          <div className="mt-8 space-y-3">
            {[
              {
                icon: BrainCircuit,
                title: "Grounded questions",
                body: "Every question is extracted or generated from indexed chunks of your material.",
              },
              {
                icon: ShieldCheck,
                title: "No invented answers",
                body: "The tutor refuses to answer when your sources do not cover the question.",
              },
              {
                icon: Database,
                title: "Visible persistence",
                body: "The app always shows whether Supabase or local storage is active.",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <item.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          {status ? (
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone={status.groqConfigured ? "brand" : "warning"} icon={Sparkles}>
                {status.groqConfigured ? `Groq · ${status.groqModel}` : "AI fallback mode"}
              </Badge>
              <Badge tone={status.supabaseConfigured ? "success" : "neutral"} icon={Database}>
                {status.supabaseConfigured ? "Supabase configured" : "Local storage mode"}
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-7">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                Create account
              </button>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {mode === "login" ? "Welcome back" : "Start closing your gaps"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {mode === "login"
                  ? "Sign in to continue your learning loop."
                  : "Create a workspace for your syllabus, notes and past papers."}
              </p>
            </div>

            <button
              type="button"
              onClick={fillDemo}
              className="mt-5 flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-3 text-left transition hover:bg-indigo-100/70"
            >
              <div>
                <p className="text-xs font-semibold text-indigo-800">Use the demo account</p>
                <p className="mt-0.5 font-mono text-[10px] text-indigo-600">
                  {DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-indigo-600" />
            </button>

            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === "signup" ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Full name
                  </span>
                  <span className="relative block">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Aditi Sharma"
                      autoComplete="name"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </span>
                </label>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Email
                </span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Password
                </span>
                <span className="relative block">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              {error ? (
                <Alert tone="error" title="Could not continue">
                  {error}
                </Alert>
              ) : null}
              {confirmation ? (
                <Alert tone="success" title="Check your inbox" icon={CheckCircle2}>
                  {confirmation}
                </Alert>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={buttonClasses("primary", "lg", "w-full")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mode === "login" ? "Sign in" : "Create account"}
                {!loading ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>

            <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-400">
              By continuing you agree that uploaded documents are processed on
              this deployment to build your study workspace.
            </p>
          </div>

          {status?.warnings?.length ? (
            <div className="mt-4 space-y-2">
              {status.warnings.slice(0, 2).map((warning) => (
                <p
                  key={warning}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800"
                >
                  {warning}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
