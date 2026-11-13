import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSessionStudent } from "@/backend/services/authService";
import { DEMO_CREDENTIALS } from "@/lib/constants";
import { buttonClasses } from "@/components/ui";

// The landing page reads the session cookie to redirect signed-in students.
// Opt out of instant-navigation validation; the route still renders on demand.
export const instant = false;
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Layers,
  MessageCircleQuestion,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";

const PIPELINE = [
  {
    icon: Upload,
    title: "Upload your material",
    body: "Syllabus, textbook chapters, notes and past papers — PDF, DOCX or TXT.",
  },
  {
    icon: Layers,
    title: "Map the topics",
    body: "Headings and syllabus outlines become a real topic map with source citations.",
  },
  {
    icon: ClipboardCheck,
    title: "Take a diagnostic",
    body: "Questions are generated only from your own indexed content.",
  },
  {
    icon: ScanSearch,
    title: "Find the gaps",
    body: "Mastery, missed concepts and exam frequency combine into a diagnosis.",
  },
  {
    icon: CalendarCheck,
    title: "Revise what matters",
    body: "A day-by-day plan prioritizes weak, high-importance topics.",
  },
];

const FEATURES = [
  {
    icon: FileSearch,
    title: "Grounded, not generic",
    body: "Retrieval runs over your uploaded chunks. Every quiz explanation and tutor answer carries a citation back to the source.",
  },
  {
    icon: Target,
    title: "Diagnosis, not a score",
    body: "Topic-level mastery, missed concepts and past-paper frequency show where marks are actually being lost.",
  },
  {
    icon: CalendarCheck,
    title: "A plan that adapts",
    body: "After every quiz, the revision plan re-prioritizes and preserves tasks you have already completed.",
  },
  {
    icon: MessageCircleQuestion,
    title: "A tutor that refuses to guess",
    body: "If your material does not cover a question, GapFinder says so and points you to what is covered.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about its limits",
    body: "No fake AI responses, no invented scores. Fallback modes are labelled, and demo content is flagged.",
  },
  {
    icon: BrainCircuit,
    title: "Real persistence",
    body: "Supabase in cloud mode, or a local JSON store for evaluation — the active mode is always visible.",
  },
];

export default async function LandingPage() {
  // Session-cookie reads must happen at request time, not during prerender.
  await connection();
  const student = await getSessionStudent();
  if (student) redirect("/dashboard");

  return (
    <div className="mesh-background min-h-screen">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
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
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonClasses("ghost", "sm", "hidden sm:inline-flex")}
          >
            Sign in
          </Link>
          <Link href="/login?mode=signup" className={buttonClasses("primary", "sm")}>
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-16">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm">
              <Sparkles className="h-3 w-3" />
              iGebra.ai AI Intern Hackathon 2026
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[56px]">
              Stop revising everything.
              <span className="brand-text-gradient block">Fix what you actually got wrong.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
              GapFinder reads your syllabus, notes and past papers, diagnoses your
              real knowledge gaps with a grounded diagnostic quiz, and builds a
              revision plan around them.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className={buttonClasses("primary", "lg")}>
                Try the demo workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login?mode=signup" className={buttonClasses("secondary", "lg")}>
                Create your account
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                PDF, DOCX & TXT ingestion
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Citations on every answer
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                No fabricated scores
              </span>
            </div>
            <div className="mt-7 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Demo credentials
              </p>
              <div className="mt-2 flex flex-col gap-1 font-mono text-xs text-slate-700 sm:flex-row sm:items-center sm:gap-5">
                <span>{DEMO_CREDENTIALS.email}</span>
                <span className="text-slate-400">/</span>
                <span>{DEMO_CREDENTIALS.password}</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                The demo account loads an original sample study pack through the
                real extraction, chunking and topic-mapping pipeline.
              </p>
            </div>
          </div>

          <div className="relative animate-slide-up">
            <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-indigo-200/50 via-violet-200/30 to-sky-200/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-indigo-900/10 backdrop-blur">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  Your learning loop
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-3.5">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                    Uploaded sources
                  </p>
                  <div className="mt-2 grid gap-2">
                    {["Syllabus · Unit 3", "Class notes · Cell Biology", "Past paper · 2025"].map(
                      (name, index) => (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-600"
                        >
                          <span>{name}</span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                            {index === 1 ? "indexed" : "ready"}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                      Diagnostic
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-800">
                      Grounded question
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                      “Which process produces the ATP used during the Calvin cycle?”
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700">
                      <FileSearch className="h-3 w-3" /> Cited to notes, page 4
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Diagnosis
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-800">
                      Highest-priority gap
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                      Light-dependent reactions — weak mastery, high exam frequency.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3.5">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <CalendarCheck className="h-3.5 w-3.5 text-indigo-500" />
                    Today&apos;s revision plan
                  </p>
                  <div className="mt-2 space-y-2">
                    {[
                      "Re-learn: Light-dependent reactions · 35m",
                      "Practice: 6 targeted questions · 25m",
                    ].map((task) => (
                      <div
                        key={task}
                        className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600"
                      >
                        <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-white" />
                        {task}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-[9px] text-slate-400">
                Illustrative product view — no scores are shown because none were earned.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-white/70">
          <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
                  How it works
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  One loop from source material to targeted revision
                </h2>
              </div>
              <p className="max-w-md text-sm text-slate-500">
                Every step is backed by records you can inspect: extracted text,
                chunks, citations, attempts and mastery.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {PIPELINE.map((step, index) => (
                <div
                  key={step.title}
                  className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-300">
                    0{index + 1}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <step.icon className="h-4.5 w-4.5" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
              What makes it different
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Built for honest diagnosis, not impressive-looking fiction
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <feature.icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="mt-3.5 text-sm font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8">
          <div className="brand-gradient relative overflow-hidden rounded-[28px] px-6 py-10 text-white shadow-xl shadow-indigo-900/15 sm:px-10">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 left-1/3 h-52 w-52 rounded-full bg-white/10" />
            <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  <BookOpenCheck className="h-3.5 w-3.5" /> Ready in a minute
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Bring your own syllabus. Leave with a plan.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  Sign in with the demo account or create your own. Upload a
                  syllabus or load the sample pack, then let the diagnostic do
                  the work.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/login"
                  className={buttonClasses(
                    "secondary",
                    "lg",
                    "border-white/20 bg-white text-indigo-700 hover:bg-indigo-50",
                  )}
                >
                  Sign in
                </Link>
                <Link
                  href="/login?mode=signup"
                  className={buttonClasses(
                    "ghost",
                    "lg",
                    "border border-white/30 text-white hover:bg-white/10 hover:text-white",
                  )}
                >
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>GapFinder AI · iGebra.ai AI Intern Hackathon 2026</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Grounded retrieval · transparent fallbacks · real persistence
          </p>
        </div>
      </footer>
    </div>
  );
}
