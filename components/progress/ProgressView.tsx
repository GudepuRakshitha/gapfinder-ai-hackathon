"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ProgressData } from "@/backend/types";
import { api, errorToMessage } from "@/lib/api";
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
import { ActivityChart, MasteryTrendChart } from "@/components/charts/ProgressCharts";
import { EngineBadge } from "@/components/shared/EngineBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Flame,
  Layers,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  cn,
  formatDateTime,
  formatDuration,
  formatMinutes,
  formatPercent,
  formatShortDate,
  relativeTime,
} from "@/lib/utils";

export function ProgressView() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<ProgressData>("/api/progress", signal);
      setData(result);
    } catch (caught) {
      setError(errorToMessage(caught, "Could not load your progress."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state changes only after the awaited API response
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading && !data) {
    return <LoadingBlock label="Loading your progress…" />;
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Progress tracker" />
        <Alert tone="error" title="Progress unavailable">
          {error}
        </Alert>
        <Button onClick={() => load()}>Try again</Button>
      </div>
    );
  }

  if (!data) return null;

  const averageAttempt =
    data.attempts.length
      ? data.attempts.reduce((sum, attempt) => sum + attempt.scorePercentage, 0) /
        data.attempts.length
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 6 · Evidence"
        title="Progress tracker"
        subtitle="Every chart and number here comes from submitted quiz attempts and completed revision tasks. Nothing is simulated."
        actions={
          <>
            <Button variant="secondary" onClick={() => load()} loading={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Link href="/quiz" className={buttonClasses("primary", "md")}>
              <ClipboardCheck className="h-4 w-4" /> New diagnostic
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Overall mastery"
          value={formatPercent(data.stats.overallMastery)}
          hint={`${data.stats.topicsAnalyzed} mapped topics`}
          icon={Trophy}
          tone={data.stats.overallMastery >= 75 ? "success" : data.stats.overallMastery >= 50 ? "warning" : "danger"}
        />
        <StatCard
          label="Quizzes submitted"
          value={data.stats.quizzesTaken}
          hint={`Average ${formatPercent(averageAttempt)}`}
          icon={ClipboardCheck}
          tone="brand"
        />
        <StatCard
          label="Questions answered"
          value={data.stats.totalQuestionsAnswered}
          hint="Across all attempts"
          icon={Target}
          tone="neutral"
        />
        <StatCard
          label="Study time"
          value={formatMinutes(data.stats.studyMinutes)}
          hint={`${data.stats.currentStreak} day streak`}
          icon={Flame}
          tone="warning"
        />
        <StatCard
          label="Knowledge gaps"
          value={data.stats.knowledgeGaps}
          hint="Weak topics remaining"
          icon={TrendingDown}
          tone="danger"
        />
      </div>

      {!data.hasAttempts ? (
        <Card className="p-6">
          <EmptyState
            icon={ClipboardCheck}
            title="No submitted attempts yet"
            description="Progress charts stay empty until you submit a diagnostic. This is deliberate: GapFinder does not invent baseline scores."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/quiz" className={buttonClasses("primary", "md")}>
                  Take your first diagnostic
                </Link>
                <Link href="/materials" className={buttonClasses("secondary", "md")}>
                  Review materials
                </Link>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <CardHeader
                title="Mastery trend"
                description="Cumulative mastery and per-quiz score"
                icon={TrendingUp}
              />
              <MasteryTrendChart data={data.masteryTrend} />
            </Card>
            <Card className="p-4">
              <CardHeader
                title="Last 7 days"
                description="Study minutes and questions answered"
                icon={Clock}
              />
              <ActivityChart data={data.activity} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="p-4">
              <CardHeader
                title="Quiz history"
                description="Most recent first · expand for topic breakdown"
                icon={ClipboardCheck}
              />
              <div className="mt-4 space-y-2.5">
                {data.attempts.map((attempt) => {
                  const open = expandedAttempt === attempt.id;
                  return (
                    <div key={attempt.id} className="rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setExpandedAttempt(open ? null : attempt.id)}
                        className="flex w-full items-center gap-3 p-3 text-left"
                        aria-expanded={open}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-[11px] font-bold",
                            attempt.scorePercentage >= 75
                              ? "bg-emerald-50 text-emerald-700"
                              : attempt.scorePercentage >= 50
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700",
                          )}
                        >
                          {formatPercent(attempt.scorePercentage)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-900">
                            {attempt.title}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                            <span>{relativeTime(attempt.submittedAt)}</span>
                            <span>·</span>
                            <span>{attempt.correctCount}/{attempt.totalQuestions} correct</span>
                            <span>·</span>
                            <span>{formatDuration(attempt.durationSeconds)}</span>
                          </span>
                        </span>
                        <EngineBadge engine={attempt.engine} />
                        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
                      </button>
                      {open ? (
                        <div className="border-t border-slate-100 px-3 pb-3 pt-2.5">
                          <p className="text-[10px] text-slate-400">
                            Submitted {formatDateTime(attempt.submittedAt)} ·{" "}
                            {formatPercent(attempt.scorePercentage)} overall
                          </p>
                          <div className="mt-2 space-y-2">
                            {attempt.topics.map((topic) => (
                              <div key={topic.topicId} className="flex items-center gap-2">
                                <span className="w-40 truncate text-[11px] font-medium text-slate-600">
                                  {topic.topicName}
                                </span>
                                <ProgressBar value={topic.percentage} className="h-1.5 flex-1" />
                                <span className="w-14 text-right text-[10px] font-semibold text-slate-600">
                                  {topic.correct}/{topic.total}
                                </span>
                                <StatusBadge status={topic.status} />
                              </div>
                            ))}
                          </div>
                          <Link
                            href="/gap-analysis"
                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            See the gaps from these answers <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-4">
                <CardHeader
                  title="Topic movement"
                  description="First vs latest attempt per topic"
                  icon={Target}
                />
                {data.topicImprovements.length ? (
                  <div className="mt-3 space-y-2">
                    {data.topicImprovements.slice(0, 8).map((item) => (
                      <div key={item.topicId} className="rounded-xl border border-slate-200 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[11px] font-semibold text-slate-800">
                            {item.topicName}
                          </p>
                          <Badge
                            tone={item.delta > 0 ? "success" : item.delta < 0 ? "danger" : "neutral"}
                            icon={item.delta >= 0 ? TrendingUp : TrendingDown}
                          >
                            {item.delta > 0 ? "+" : ""}
                            {item.delta}%
                          </Badge>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{item.firstScore}% first</span>
                          <ArrowRight className="h-3 w-3 text-slate-300" />
                          <span className="font-semibold text-slate-700">{item.latestScore}% latest</span>
                          <span>· {item.attempts} attempt{item.attempts === 1 ? "" : "s"}</span>
                          <StatusBadge status={item.status} className="ml-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-slate-500">
                    Take at least two quizzes on a topic to see movement here.
                  </p>
                )}
              </Card>

              <Card className="p-4">
                <CardHeader
                  title="Today's tasks"
                  description={data.latestPlan ? `Plan updated ${formatShortDate(data.latestPlan.updatedAt)}` : "No active plan"}
                  icon={Layers}
                  action={
                    <Link href="/revision-plan" className={buttonClasses("ghost", "sm")}>
                      Open
                    </Link>
                  }
                />
                {data.todayTasks.length ? (
                  <div className="mt-3 space-y-2">
                    {data.todayTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-start gap-2 rounded-xl border border-slate-200 p-2.5">
                        <span
                          className={cn(
                            "mt-1 h-2 w-2 shrink-0 rounded-full",
                            task.completed ? "bg-emerald-500" : task.priority === "high" ? "bg-rose-500" : "bg-amber-400",
                          )}
                        />
                        <div className="min-w-0">
                          <p className={cn("text-[11px] font-semibold", task.completed ? "text-slate-400 line-through" : "text-slate-800")}>
                            {task.title}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {task.topicName} · {formatMinutes(task.durationMinutes)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-slate-500">
                    No tasks scheduled for today. Create a plan or finish outstanding tasks.
                  </p>
                )}
              </Card>

              {data.gapAnalysis.warnings.length ? (
                <Alert tone="warning" title="Analysis notes" icon={AlertTriangle}>
                  <ul className="list-disc space-y-1 pl-4">
                    {data.gapAnalysis.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <CardHeader title="Strongest topics" description="Best supported by evidence" icon={Trophy} />
              <div className="mt-3 space-y-2">
                {[...data.gapAnalysis.topics]
                  .filter((topic) => topic.attempted > 0)
                  .sort((a, b) => b.mastery - a.mastery)
                  .slice(0, 5)
                  .map((topic) => (
                    <div key={topic.topicId} className="flex items-center gap-2">
                      <span className="w-36 truncate text-[11px] font-medium text-slate-700">{topic.topicName}</span>
                      <ProgressBar value={topic.mastery} className="h-1.5 flex-1" />
                      <span className="w-9 text-right text-[10px] font-semibold text-slate-600">{formatPercent(topic.mastery)}</span>
                      <StatusBadge status={topic.status} />
                    </div>
                  ))}
                {!data.gapAnalysis.topics.some((topic) => topic.attempted > 0) ? (
                  <p className="text-[11px] text-slate-500">No assessed topics yet.</p>
                ) : null}
              </div>
            </Card>
            <Card className="p-4">
              <CardHeader title="Remaining gaps" description="Weakest assessed topics" icon={Target} />
              <div className="mt-3 space-y-2">
                {[...data.gapAnalysis.topics]
                  .filter((topic) => topic.attempted > 0)
                  .sort((a, b) => a.mastery - b.mastery)
                  .slice(0, 5)
                  .map((topic) => (
                    <div key={topic.topicId} className="flex items-center gap-2">
                      <span className="w-36 truncate text-[11px] font-medium text-slate-700">{topic.topicName}</span>
                      <ProgressBar value={topic.mastery} className="h-1.5 flex-1" />
                      <span className="w-9 text-right text-[10px] font-semibold text-slate-600">{formatPercent(topic.mastery)}</span>
                      <StatusBadge status={topic.status} />
                    </div>
                  ))}
                {!data.gapAnalysis.topics.some((topic) => topic.attempted > 0) ? (
                  <p className="text-[11px] text-slate-500">No assessed topics yet.</p>
                ) : null}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
