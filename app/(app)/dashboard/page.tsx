"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ProgressData, RevisionTask } from "@/backend/types";
import { api, errorToMessage } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  StatCard,
  buttonClasses,
} from "@/components/ui";
import { MasteryDonut, DistributionLegend } from "@/components/charts/MasteryDonut";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EngineBadge } from "@/components/shared/EngineBadge";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers,
  ListChecks,
  ScanSearch,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  Zap,
} from "lucide-react";
import {
  formatMinutes,
  formatPercent,
  formatShortDate,
  relativeTime,
} from "@/lib/utils";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface OnboardingStep {
  label: string;
  description: string;
  href: string;
  done: boolean;
  icon: typeof Upload;
}

export default function DashboardPage() {
  const { student, session } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await api.get<ProgressData>("/api/progress", signal);
      setData(result);
      setError(null);
    } catch (caught) {
      if (caught instanceof Error && caught.name === "ApiError" && (caught as { code?: string }).code === "ABORTED") {
        return;
      }
      setError(errorToMessage(caught, "Could not load your dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state changes only after the awaited API response
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const completeTask = async (task: RevisionTask) => {
    setCompleting(task.id);
    try {
      await api.patch(`/api/revision-plan/tasks/${task.id}`, { completed: true });
      toast.success("Task complete", task.title);
      await load();
    } catch (caught) {
      toast.error("Could not update task", errorToMessage(caught));
    } finally {
      setCompleting(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <LoadingBlock label="Loading your learning dashboard…" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Learning dashboard" />
        <Alert tone="error" title="Dashboard unavailable">
          {error}
        </Alert>
        <Button onClick={refresh}>Try again</Button>
      </div>
    );
  }

  if (!data) return null;

  const firstName = (student.fullName || student.email).split(/\s+/)[0];
  const steps: OnboardingStep[] = [
    {
      label: "Add study material",
      description: "Syllabus, notes or a past paper",
      href: "/materials",
      done: data.hasMaterials,
      icon: Upload,
    },
    {
      label: "Map your topics",
      description: "Build the syllabus topic map",
      href: "/topics",
      done: data.hasTopics,
      icon: Layers,
    },
    {
      label: "Take a diagnostic",
      description: "Grounded questions from your sources",
      href: "/quiz",
      done: data.hasAttempts,
      icon: ClipboardCheck,
    },
    {
      label: "Generate a plan",
      description: "Schedule targeted revision",
      href: "/revision-plan",
      done: Boolean(data.latestPlan),
      icon: CalendarCheck,
    },
  ];
  const completedSteps = steps.filter((step) => step.done).length;

  const focusTopics = [...data.gapAnalysis.topics]
    .filter((topic) => topic.status === "weak" || topic.status === "not_assessed")
    .sort(
      (a, b) =>
        b.importance * 10 + b.examFrequency - (a.importance * 10 + a.examFrequency),
    )
    .slice(0, 4);

  const pendingTasks = data.todayTasks.filter((task) => !task.completed).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title={`${greeting()}, ${firstName}`}
        subtitle="Here is what your own study material says about your gaps right now."
        actions={
          <>
            <Link href="/quiz" className={buttonClasses("primary", "md")}>
              <Zap className="h-4 w-4" />
              Start diagnostic
            </Link>
            <Link href="/materials" className={buttonClasses("secondary", "md")}>
              <Upload className="h-4 w-4" />
              Add material
            </Link>
          </>
        }
      />

      {data.hasDemoMaterials ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs text-indigo-800">
          <Badge tone="brand" icon={Sparkles}>Demo content</Badge>
          <span>
            The bundled sample pack was processed through the real ingestion
            pipeline. Quiz attempts and scores are only created when you take a quiz.
          </span>
        </div>
      ) : null}

      {!session.groqConfigured || session.mode === "local" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {!session.groqConfigured ? (
            <Alert tone="warning" title="AI generation is in fallback mode">
              Quizzes use source-grounded extractive questions, the tutor returns
              retrieved excerpts, and narratives are rule-based. Set{" "}
              <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-[10px]">GROQ_API_KEY</code>{" "}
              to enable Groq/Llama generation.
            </Alert>
          ) : null}
          {session.mode === "local" ? (
            <Alert tone="info" title="Local storage mode">
              No Supabase credentials detected, so your workspace is stored in a
              local JSON file. Configure Supabase for durable production
              persistence.
            </Alert>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Overall mastery"
          value={formatPercent(data.stats.overallMastery)}
          hint={`${data.stats.topicsAnalyzed} topics mapped`}
          icon={Trophy}
          tone={data.stats.overallMastery >= 75 ? "success" : data.stats.overallMastery >= 50 ? "warning" : "danger"}
        />
        <StatCard
          label="Knowledge gaps"
          value={data.stats.knowledgeGaps}
          hint="Weak topics to target"
          icon={Target}
          tone="danger"
        />
        <StatCard
          label="Quizzes taken"
          value={data.stats.quizzesTaken}
          hint={`${data.stats.totalQuestionsAnswered} questions answered`}
          icon={ClipboardCheck}
          tone="brand"
        />
        <StatCard
          label="Study time"
          value={formatMinutes(data.stats.studyMinutes)}
          hint={`${data.stats.currentStreak} day streak`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Indexed sources"
          value={data.stats.materialsCount}
          hint={`${data.stats.chunkCount} searchable chunks`}
          icon={FileText}
          tone="neutral"
        />
      </div>

      {!data.hasMaterials ? (
        <Card className="p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <Badge tone="brand" icon={Sparkles}>Start here</Badge>
              <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                Your workspace is empty — bring your own material
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                Upload a syllabus, class notes and a past paper. GapFinder extracts
                the text, indexes it into searchable chunks, then builds grounded
                quizzes and a topic map from what you actually study.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/materials" className={buttonClasses("primary", "md")}>
                  <Upload className="h-4 w-4" /> Upload material
                </Link>
                <Link href="/materials?sample=1" className={buttonClasses("secondary", "md")}>
                  <Sparkles className="h-4 w-4" /> Load sample pack
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700">Supported formats</p>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
                <li>· PDF (page-aware citations)</li>
                <li>· DOCX (Word documents)</li>
                <li>· TXT and markdown-style notes</li>
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                Maximum 10 MB per file. Scanned image-only PDFs need OCR first.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <CardHeader
              title="Your learning loop"
              description={`${completedSteps} of ${steps.length} steps complete`}
              icon={ListChecks}
              action={
                <Link href="/materials" className={buttonClasses("ghost", "sm")}>
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            <div className="mt-4 space-y-2">
              {steps.map((step, index) => (
                <Link
                  key={step.label}
                  href={step.href}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <span
                    className={
                      step.done
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                        : "flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500"
                    }
                  >
                    {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-900">
                      {step.label}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {step.description}
                    </span>
                  </span>
                  <step.icon className="h-4 w-4 text-slate-300 group-hover:text-indigo-500" />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Mastery distribution"
              description="Across your mapped topics"
              icon={Target}
              action={
                <Link href="/gap-analysis" className={buttonClasses("ghost", "sm")}>
                  Details
                </Link>
              }
            />
            <MasteryDonut
              distribution={data.gapAnalysis.distribution}
              overallMastery={data.gapAnalysis.overallMastery}
              assessed={data.gapAnalysis.assessedTopics}
              total={data.gapAnalysis.totalTopics}
            />
            <DistributionLegend distribution={data.gapAnalysis.distribution} />
          </Card>
        </div>
      )}

      {data.hasMaterials ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <CardHeader
              title="Priority focus areas"
              description="Weak and unassessed topics weighted by importance and exam frequency"
              icon={Target}
              action={
                <Link href="/gap-analysis" className={buttonClasses("ghost", "sm")}>
                  Gap analysis <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            {!data.hasTopics ? (
              <div className="mt-4">
                <EmptyState
                  icon={Layers}
                  title="Topics have not been mapped yet"
                  description="Analyse your uploaded material to build the topic map."
                  action={
                    <Link href="/topics" className={buttonClasses("primary", "sm")}>
                      Map topics
                    </Link>
                  }
                />
              </div>
            ) : focusTopics.length ? (
              <div className="mt-4 space-y-2.5">
                {focusTopics.map((topic) => (
                  <div
                    key={topic.topicId}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {topic.topicName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {topic.subjectName} · importance {topic.importance}/5 ·{" "}
                          {topic.examFrequency} past-paper match
                          {topic.examFrequency === 1 ? "" : "es"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={topic.status} />
                        <Link
                          href={`/quiz?topicId=${encodeURIComponent(topic.topicId)}`}
                          className={buttonClasses("soft", "sm")}
                        >
                          Quiz
                        </Link>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={topic.mastery} className="h-1.5" />
                      <span className="w-9 text-right text-[11px] font-semibold text-slate-600">
                        {formatPercent(topic.mastery)}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                      {topic.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  icon={Trophy}
                  title="No weak topics right now"
                  description="Take another diagnostic to keep your mastery evidence current."
                  action={
                    <Link href="/quiz" className={buttonClasses("primary", "sm")}>
                      Take a quiz
                    </Link>
                  }
                />
              </div>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Today's plan"
              description={
                data.latestPlan
                  ? formatShortDate(data.latestPlan.updatedAt)
                  : "No plan generated yet"
              }
              icon={CalendarCheck}
              action={
                <Link href="/revision-plan" className={buttonClasses("ghost", "sm")}>
                  Open
                </Link>
              }
            />
            {pendingTasks.length ? (
              <div className="mt-4 space-y-2">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => completeTask(task)}
                        disabled={completing === task.id}
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-transparent transition hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-50"
                        aria-label={`Mark ${task.title} complete`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-snug text-slate-900">
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {task.topicName} · {formatMinutes(task.durationMinutes)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Link
                  href="/revision-plan"
                  className={buttonClasses("secondary", "sm", "w-full")}
                >
                  View full plan <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  icon={CalendarCheck}
                  title={data.latestPlan ? "Everything due is done" : "No revision plan yet"}
                  description={
                    data.latestPlan
                      ? "Great work. The plan updates after your next quiz."
                      : "Generate a schedule based on your current gaps."
                  }
                  action={
                    <Link href="/revision-plan" className={buttonClasses("primary", "sm")}>
                      {data.latestPlan ? "Open plan" : "Create plan"}
                    </Link>
                  }
                />
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {data.hasAttempts ? (
        <Card className="p-4">
          <CardHeader
            title="Recent quizzes"
            description="Only submitted attempts are shown"
            icon={ClipboardCheck}
            action={
              <Link href="/progress" className={buttonClasses("ghost", "sm")}>
                All progress <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Quiz</th>
                  <th className="pb-2 font-semibold">Submitted</th>
                  <th className="pb-2 font-semibold">Engine</th>
                  <th className="pb-2 text-right font-semibold">Score</th>
                  <th className="pb-2 text-right font-semibold">Questions</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.slice(0, 4).map((attempt) => (
                  <tr key={attempt.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-slate-800">
                      {attempt.title}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-500">
                      {relativeTime(attempt.submittedAt)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <EngineBadge engine={attempt.engine} />
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {formatPercent(attempt.scorePercentage)}
                    </td>
                    <td className="py-2.5 text-right text-slate-500">
                      {attempt.correctCount}/{attempt.totalQuestions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/materials", label: "Study materials", body: "Upload and re-index sources", icon: FileText },
          { href: "/topics", label: "Topic map", body: "Inspect topics and citations", icon: Layers },
          { href: "/gap-analysis", label: "Gap analysis", body: "See exactly what to fix", icon: ScanSearch },
          { href: "/tutor", label: "AI tutor", body: "Ask your own material", icon: BookOpen },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
              <item.icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{item.body}</p>
            </div>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 self-center text-slate-300 group-hover:text-indigo-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
