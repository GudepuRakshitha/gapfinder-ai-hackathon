"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RevisionPlan, RevisionTask } from "@/backend/types";
import { api, errorToMessage } from "@/lib/api";
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
import {
  PLAN_MAX_DAYS,
  PLAN_MAX_HOURS,
  PLAN_MIN_DAYS,
  PLAN_MIN_HOURS,
} from "@/lib/constants";
import {
  addDaysISO,
  cn,
  formatDate,
  formatMinutes,
  formatPercent,
  todayISO,
} from "@/lib/utils";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flame,
  Layers,
  ListChecks,
  Printer,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

const TYPE_META: Record<
  RevisionTask["taskType"],
  { label: string; tone: "brand" | "info" | "success" | "warning" }
> = {
  learn: { label: "Learn", tone: "brand" },
  practice: { label: "Practice", tone: "info" },
  review: { label: "Review", tone: "success" },
  test: { label: "Test", tone: "warning" },
};

const PRIORITY_META: Record<
  RevisionTask["priority"],
  { label: string; tone: "danger" | "warning" | "neutral" }
> = {
  high: { label: "High priority", tone: "danger" },
  medium: { label: "Medium priority", tone: "warning" },
  low: { label: "Maintenance", tone: "neutral" },
};

export function RevisionPlanView() {
  const toast = useToast();
  const [plan, setPlan] = useState<RevisionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [hours, setHours] = useState(2);
  const [examDate, setExamDate] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ plan: RevisionPlan | null }>("/api/revision-plan", signal);
      setPlan(result.plan);
      if (result.plan) {
        setDays(result.plan.daysAvailable);
        setHours(Number(result.plan.hoursPerDay));
        setExamDate(result.plan.examDate ?? "");
      }
    } catch (caught) {
      setError(errorToMessage(caught, "Could not load your revision plan."));
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

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.post<RevisionPlan>("/api/revision-plan", {
        daysAvailable: days,
        hoursPerDay: hours,
        examDate: examDate || null,
      });
      setPlan(result);
      toast.success(
        plan ? "Revision plan updated" : "Revision plan created",
        `${result.tasks.length} tasks across ${result.daysAvailable} days.`,
      );
    } catch (caught) {
      const message = errorToMessage(caught, "Could not generate the revision plan.");
      setError(message);
      toast.error("Could not generate the plan", message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (task: RevisionTask) => {
    const nextCompleted = !task.completed;
    setToggling(task.id);
    setPlan((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((item) =>
              item.id === task.id
                ? {
                    ...item,
                    completed: nextCompleted,
                    completedAt: nextCompleted ? new Date().toISOString() : null,
                  }
                : item,
            ),
          }
        : current,
    );
    try {
      const result = await api.patch<{ task: RevisionTask }>(
        `/api/revision-plan/tasks/${task.id}`,
        { completed: nextCompleted },
      );
      setPlan((current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((item) =>
                item.id === result.task.id ? result.task : item,
              ),
            }
          : current,
      );
    } catch (caught) {
      toast.error("Could not update the task", errorToMessage(caught));
      await load();
    } finally {
      setToggling(null);
    }
  };

  const completed = plan?.tasks.filter((task) => task.completed).length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  const grouped = useMemo(() => {
    if (!plan) return [];
    const map = new Map<number, RevisionTask[]>();
    for (const task of plan.tasks) {
      const list = map.get(task.dayIndex) ?? [];
      list.push(task);
      map.set(task.dayIndex, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dayIndex, tasks]) => ({
        dayIndex,
        date: tasks[0]?.scheduledDate ?? addDaysISO(todayISO(), dayIndex),
        tasks: tasks.sort((a, b) => a.sortOrder - b.sortOrder),
      }));
  }, [plan]);

  if (loading && !plan) {
    return <LoadingBlock label="Loading your revision plan…" />;
  }

  const setupCard = (
    <Card className="p-5">
      <CardHeader
        title={plan ? "Regenerate plan" : "Create your revision plan"}
        description="The schedule is calculated from your current mastery, topic importance and exam frequency."
        icon={CalendarCheck}
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
            Days available
          </span>
          <input
            type="number"
            min={PLAN_MIN_DAYS}
            max={PLAN_MAX_DAYS}
            value={days}
            onChange={(event) => setDays(Math.min(PLAN_MAX_DAYS, Math.max(PLAN_MIN_DAYS, Number(event.target.value) || PLAN_MIN_DAYS)))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <span className="mt-1 block text-[10px] text-slate-500">
            {PLAN_MIN_DAYS}–{PLAN_MAX_DAYS} days. Revision starts today.
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
            Study hours per day
          </span>
          <input
            type="number"
            min={PLAN_MIN_HOURS}
            max={PLAN_MAX_HOURS}
            step={0.5}
            value={hours}
            onChange={(event) => setHours(Math.min(PLAN_MAX_HOURS, Math.max(PLAN_MIN_HOURS, Math.round((Number(event.target.value) || PLAN_MIN_HOURS) * 2) / 2)))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <span className="mt-1 block text-[10px] text-slate-500">
            About 90% is scheduled as focused tasks.
          </span>
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">
          Exam date (optional)
        </span>
        <input
          type="date"
          min={todayISO()}
          value={examDate}
          onChange={(event) => setExamDate(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-64"
        />
        <span className="mt-1 block text-[10px] text-slate-500">
          If set, the plan never extends past your exam.
        </span>
      </label>

      <Button onClick={generate} loading={generating} size="lg" className="mt-5 w-full sm:w-auto">
        <Sparkles className="h-4 w-4" />
        {plan ? "Regenerate schedule" : "Generate revision plan"}
      </Button>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        Regenerating keeps completed tasks completed whenever the same topic
        still appears in the schedule.
      </p>
    </Card>
  );

  if (!plan) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Step 5 · Plan"
          title="Personalized revision plan"
          subtitle="A day-by-day schedule that prioritizes weak, high-importance and frequently examined topics."
        />
        {error ? (
          <Alert tone="error" title="Plan unavailable">
            {error}
          </Alert>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          {setupCard}
          <Card className="p-5">
            {error ? (
              <EmptyState
                icon={Layers}
                title="Map topics before planning"
                description="A revision plan needs a topic map. Upload your material and run topic analysis first."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link href="/materials" className={buttonClasses("primary", "md")}>
                      Upload material
                    </Link>
                    <Link href="/topics" className={buttonClasses("secondary", "md")}>
                      Map topics
                    </Link>
                  </div>
                }
              />
            ) : (
              <>
                <CardHeader
                  title="How the schedule is built"
                  description="Transparent rules, not a black box"
                  icon={ListChecks}
                />
                <ul className="mt-4 space-y-3">
                  {[
                    "Weak topics are scheduled first, weighted by syllabus importance and past-paper frequency.",
                    "Unassessed topics get a baseline diagnostic slot early in the plan.",
                    "Each topic cycles through learn → practice → review.",
                    "The final day includes a full mixed re-test when time allows.",
                    "After every quiz, the plan refreshes with your new evidence.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 5 · Plan"
        title="Personalized revision plan"
        subtitle={`${formatDate(plan.createdAt)} · ${plan.daysAvailable} days · ${plan.hoursPerDay}h per day${plan.examDate ? ` · exam ${formatDate(plan.examDate)}` : ""}`}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="secondary" onClick={() => load()} loading={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </>
        }
      />

      {error ? (
        <Alert tone="error" title="Plan update failed">
          {error}
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Plan progress" value={formatPercent(progress)} hint={`${completed} of ${total} tasks`} icon={ListChecks} tone={progress >= 75 ? "success" : "brand"} />
        <StatCard label="Scheduled time" value={formatMinutes(plan.totalMinutes)} hint={`${plan.hoursPerDay}h per day`} icon={Clock} tone="neutral" />
        <StatCard label="Days" value={plan.daysAvailable} hint={plan.examDate ? `Exam in ${formatDate(plan.examDate)}` : "No exam date set"} icon={CalendarCheck} tone="brand" />
        <StatCard label="Summary engine" value={plan.aiEnhanced ? "Groq AI" : "Rule-based"} hint="Plan priorities are always deterministic" icon={Sparkles} tone="brand" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Plan summary</h2>
              <Badge tone={plan.aiEnhanced ? "brand" : "neutral"} icon={Sparkles}>
                {plan.aiEnhanced ? "AI narrative" : "Rule-based narrative"}
              </Badge>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {plan.summary}
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-48">
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
              <span>Completed</span>
              <span>{completed}/{total}</span>
            </div>
            <ProgressBar value={progress} className="mt-1.5" tone="success" />
            <Link
              href="/gap-analysis"
              className={buttonClasses("secondary", "sm", "mt-2 w-full")}
            >
              <Target className="h-3.5 w-3.5" /> Why these topics?
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {grouped.map((group) => {
            const isToday = group.date === todayISO();
            const isPast = group.date < todayISO();
            const dayDone = group.tasks.every((task) => task.completed);
            return (
              <Card key={group.dayIndex} className={cn("p-4 print-block", isToday && "ring-2 ring-indigo-200")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold",
                        dayDone
                          ? "bg-emerald-100 text-emerald-700"
                          : isToday
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {dayDone ? <CheckCircle2 className="h-4 w-4" /> : group.dayIndex + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Day {group.dayIndex + 1}
                        {isToday ? <span className="ml-1.5 text-[10px] font-bold text-indigo-600">TODAY</span> : null}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatDate(`${group.date}T12:00:00.000Z`, { weekday: "long", month: "short", day: "numeric" })}
                        {isPast && !dayDone ? " · overdue" : ""}
                      </p>
                    </div>
                  </div>
                  <Badge tone="outline">
                    {formatMinutes(group.tasks.reduce((sum, task) => sum + task.durationMinutes, 0))}
                  </Badge>
                </div>

                <div className="mt-3 space-y-2">
                  {group.tasks.map((task) => {
                    const typeMeta = TYPE_META[task.taskType];
                    const priorityMeta = PRIORITY_META[task.priority];
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "rounded-xl border p-3 transition",
                          task.completed
                            ? "border-emerald-200 bg-emerald-50/40"
                            : "border-slate-200 bg-white",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleTask(task)}
                            disabled={toggling === task.id}
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                              task.completed
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-slate-300 bg-white text-transparent hover:border-indigo-400 hover:text-indigo-400",
                            )}
                            aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
                            aria-pressed={task.completed}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p
                                className={cn(
                                  "text-xs font-semibold leading-snug",
                                  task.completed ? "text-slate-500 line-through" : "text-slate-900",
                                )}
                              >
                                {task.title}
                              </p>
                              <Badge tone={typeMeta.tone}>{typeMeta.label}</Badge>
                              {task.priority === "high" ? (
                                <Badge tone="danger" icon={Flame}>
                                  High
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {task.topicName} · {task.subjectName} · {formatMinutes(task.durationMinutes)}
                            </p>
                            <ul className="mt-1.5 space-y-1">
                              {task.objectives.map((objective) => (
                                <li key={objective} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                                  {objective}
                                </li>
                              ))}
                            </ul>
                            {task.topicId && !task.completed ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Link
                                  href={`/quiz?topicId=${encodeURIComponent(task.topicId)}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                  <ClipboardCheck className="h-3 w-3" /> Quiz this topic
                                </Link>
                                <span className="text-slate-300">·</span>
                                <Link
                                  href={`/tutor?topicId=${encodeURIComponent(task.topicId)}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                  Ask the tutor
                                </Link>
                              </div>
                            ) : null}
                          </div>
                          <span className="shrink-0 pt-0.5 text-[9px] font-medium text-slate-400">
                            {priorityMeta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          {setupCard}
          <Card className="p-4">
            <CardHeader title="Plan rules" description="What the schedule optimizes" icon={Target} />
            <ul className="mt-3 space-y-2">
              {[
                "Weak topics before strong topics.",
                "High exam-frequency topics get more repetitions.",
                "Unassessed topics get an early baseline quiz.",
                "Later days shift toward retrieval practice and mixed tests.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600">
                  <Zap className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <CardHeader title="Keep the plan alive" description="Evidence changes the schedule" icon={RefreshCw} />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Every submitted quiz updates mastery and refreshes this plan. Completed
              tasks stay completed when their topic remains in the schedule.
            </p>
            <Link href="/quiz" className={buttonClasses("primary", "sm", "mt-3 w-full")}>
              Take a diagnostic <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
          {plan.examDate ? (
            <Card className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Countdown
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {Math.max(
                  0,
                  Math.round(
                    (new Date(`${plan.examDate}T12:00:00.000Z`).getTime() -
                      new Date().getTime()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )}{" "}
                <span className="text-xs font-medium text-slate-500">days</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Exam on {formatDate(plan.examDate)}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
