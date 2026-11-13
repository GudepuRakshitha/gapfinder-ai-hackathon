"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  EvaluateResponse,
  GapAnalysis,
  GenerateQuizResponse,
  QuizDifficulty,
  Topic,
} from "@/backend/types";
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
  buttonClasses,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EngineBadge } from "@/components/shared/EngineBadge";
import { SourceList } from "@/components/shared/SourceList";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_OPTIONS,
  QUIZ_DEFAULT_QUESTIONS,
  QUIZ_MAX_QUESTIONS,
  QUIZ_MIN_QUESTIONS,
} from "@/lib/constants";
import {
  cn,
  formatDuration,
  formatPercent,
  scoreTone,
} from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Layers,
  RefreshCw,
  ScanSearch,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";

interface TopicsResponse {
  topics: Topic[];
  hasTopics: boolean;
  materialCount: number;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type Stage = "setup" | "quiz" | "results";

export function QuizView({ initialTopicId }: { initialTopicId?: string }) {
  const toast = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [stage, setStage] = useState<Stage>("setup");
  const [scope, setScope] = useState<"topic" | "mixed">(initialTopicId ? "topic" : "mixed");
  const [topicId, setTopicId] = useState(initialTopicId ?? "");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("mixed");
  const [count, setCount] = useState(QUIZ_DEFAULT_QUESTIONS);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<GenerateQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const startedAt = useRef<number | null>(null);

  const loadTopics = useCallback(async (signal?: AbortSignal) => {
    setLoadingTopics(true);
    try {
      const [topicsResponse, analysis] = await Promise.all([
        api.get<TopicsResponse>("/api/topics", signal),
        api.get<GapAnalysis>("/api/gap-analysis", signal),
      ]);
      setTopics(topicsResponse.topics);
      setGap(analysis);
      setTopicId((current) => {
        if (current && topicsResponse.topics.some((topic) => topic.id === current)) {
          return current;
        }
        return topicsResponse.topics[0]?.id ?? "";
      });
    } catch (caught) {
      setError(errorToMessage(caught, "Could not load your topics."));
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state changes only after the awaited API response
    loadTopics(controller.signal);
    return () => controller.abort();
  }, [loadTopics]);

  useEffect(() => {
    if (stage !== "quiz") return;
    const interval = window.setInterval(() => {
      if (startedAt.current) {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [stage]);

  const performanceMap = useMemo(
    () => new Map((gap?.topics ?? []).map((topic) => [topic.topicId, topic])),
    [gap],
  );

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await api.post<GenerateQuizResponse>("/api/generate-quiz", {
        ...(scope === "topic" && topicId ? { topicId } : {}),
        difficulty,
        count,
      });
      setQuiz(response);
      const blank: Record<string, number | null> = {};
      for (const question of response.questions) blank[question.id] = null;
      setAnswers(blank);
      setIndex(0);
      setElapsed(0);
      setResult(null);
      startedAt.current = Date.now();
      setStage("quiz");
      if (response.warnings.length) {
        toast.info("Quiz notes", response.warnings[0]);
      }
    } catch (caught) {
      setError(errorToMessage(caught, "Could not generate a quiz."));
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!quiz) return;
    setConfirmSubmit(false);
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.post<EvaluateResponse>("/api/evaluate", {
        attemptId: quiz.attempt.id,
        answers: quiz.questions.map((question) => ({
          questionId: question.id,
          selectedOptionIndex: answers[question.id] ?? null,
        })),
        durationSeconds: elapsed,
      });
      setResult(response);
      setStage("results");
      toast.success(
        "Quiz scored",
        `${formatPercent(response.attempt.scorePercentage)} · ${response.attempt.correctCount}/${response.attempt.totalQuestions} correct.`,
      );
    } catch (caught) {
      setError(errorToMessage(caught, "Could not submit this quiz."));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setQuiz(null);
    setResult(null);
    setAnswers({});
    setIndex(0);
    setElapsed(0);
    startedAt.current = null;
    setStage("setup");
  };

  if (loadingTopics) {
    return <LoadingBlock label="Loading your topics…" />;
  }

  if (!topics.length) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Step 3 · Diagnostic" title="Diagnostic quiz" />
        <Card className="p-6">
          <EmptyState
            icon={Layers}
            title="Map your topics before taking a quiz"
            description="Grounded questions need a topic map and indexed source material. Upload a syllabus or notes, then analyse the topics."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/materials" className={buttonClasses("primary", "md")}>
                  Upload material
                </Link>
                <Link href="/topics" className={buttonClasses("secondary", "md")}>
                  Open topic map
                </Link>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  const selectedTopic = topics.find((topic) => topic.id === topicId) ?? topics[0];
  const answeredCount = quiz
    ? quiz.questions.filter((question) => answers[question.id] !== null && answers[question.id] !== undefined).length
    : 0;

  if (stage === "setup") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Step 3 · Diagnostic"
          title="Diagnostic quiz"
          subtitle="Questions are generated from your indexed material. Answers are evaluated on the server and saved to your mastery record."
          actions={
            <Badge tone="outline" icon={Clock}>
              ~{Math.round((count * 90) / 60)} min
            </Badge>
          }
        />

        {error ? (
          <Alert tone="error" title="Quiz unavailable">
            {error}
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="p-5">
            <CardHeader
              title="Build your diagnostic"
              description="Choose what to test and how many questions to answer."
              icon={ClipboardCheck}
            />

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-slate-700">Scope</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setScope("mixed")}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    scope === "mixed"
                      ? "border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <Target className="h-3.5 w-3.5 text-indigo-500" /> Smart mixed
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                    Prioritizes weak and unassessed topics across your subjects.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope("topic")}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    scope === "topic"
                      ? "border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" /> Single topic
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                    Focus every question on one topic you choose.
                  </span>
                </button>
              </div>
            </div>

            {scope === "topic" ? (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Topic
                </span>
                <select
                  value={selectedTopic?.id ?? ""}
                  onChange={(event) => setTopicId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {topics.map((topic) => {
                    const performance = performanceMap.get(topic.id);
                    return (
                      <option key={topic.id} value={topic.id}>
                        {topic.subjectName} · {topic.name}
                        {performance ? ` (${formatPercent(performance.mastery)} mastery)` : " (not assessed)"}
                      </option>
                    );
                  })}
                </select>
                {selectedTopic ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={performanceMap.get(selectedTopic.id)?.status ?? "not_assessed"} />
                    <span className="text-[10px] text-slate-500">
                      Importance {selectedTopic.importance}/5 · {selectedTopic.examFrequency} past-paper match
                      {selectedTopic.examFrequency === 1 ? "" : "es"}
                    </span>
                  </div>
                ) : null}
              </label>
            ) : null}

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-slate-700">Difficulty</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDifficulty(option.value)}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition",
                      difficulty === option.value
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    )}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">
                {DIFFICULTY_OPTIONS.find((option) => option.value === difficulty)?.description}
              </p>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Questions</p>
                <span className="text-xs font-bold text-indigo-600">{count}</span>
              </div>
              <input
                type="range"
                min={QUIZ_MIN_QUESTIONS}
                max={QUIZ_MAX_QUESTIONS}
                step={1}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="mt-2 w-full accent-indigo-600"
                aria-label="Number of questions"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{QUIZ_MIN_QUESTIONS}</span>
                <span>{QUIZ_MAX_QUESTIONS}</span>
              </div>
            </div>

            <Button onClick={generate} loading={generating} size="lg" className="mt-6 w-full">
              <Sparkles className="h-4 w-4" />
              Generate diagnostic quiz
            </Button>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Generation may take a few seconds. Every question is checked against
              an indexed source chunk.
            </p>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <CardHeader
                title="What to expect"
                description="No generic textbook questions"
                icon={ScanSearch}
              />
              <ul className="mt-3 space-y-2.5">
                {[
                  "Multiple-choice questions grounded in your own chunks.",
                  "Citations are revealed after submission, never before.",
                  "Scores update topic mastery immediately.",
                  "The revision plan refreshes after you submit.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <CardHeader
                title="Focus suggestions"
                description="Based on current mastery evidence"
                icon={Target}
              />
              <div className="mt-3 space-y-2">
                {[...topics]
                  .sort((a, b) => {
                    const aPerf = performanceMap.get(a.id);
                    const bPerf = performanceMap.get(b.id);
                    return (aPerf?.mastery ?? -1) - (bPerf?.mastery ?? -1);
                  })
                  .slice(0, 3)
                  .map((topic) => {
                    const performance = performanceMap.get(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          setScope("topic");
                          setTopicId(topic.id);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-semibold text-slate-800">
                            {topic.name}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {performance?.status === "weak"
                              ? "Weak — prioritize"
                              : performance?.status === "not_assessed"
                                ? "Not assessed yet"
                                : "Keep it strong"}
                          </span>
                        </span>
                        <StatusBadge status={performance?.status ?? "not_assessed"} />
                      </button>
                    );
                  })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "quiz" && quiz) {
    const question = quiz.questions[index];
    const selected = answers[question.id];
    const progress = ((index + 1) / quiz.questions.length) * 100;

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                {quiz.attempt.title}
              </h1>
              <EngineBadge engine={quiz.engine} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Question {index + 1} of {quiz.questions.length} · {answeredCount} answered ·{" "}
              {formatDuration(elapsed)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="outline" icon={Clock}>{formatDuration(elapsed)}</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmSubmit(true)}
              disabled={submitting}
            >
              Submit quiz
            </Button>
          </div>
        </div>

        <ProgressBar value={progress} tone="brand" label="Quiz progress" />

        {error ? (
          <Alert tone="error" title="Quiz error">
            {error}
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{question.topicName}</Badge>
              <Badge tone="outline">{DIFFICULTY_LABELS[question.difficulty]}</Badge>
              <span className="text-[10px] text-slate-400">{question.subjectName}</span>
            </div>
            <h2 className="mt-4 text-base font-semibold leading-relaxed text-slate-900">
              {question.question}
            </h2>

            <div className="mt-5 space-y-2">
              {question.options.map((option, optionIndex) => {
                const isSelected = selected === optionIndex;
                return (
                  <button
                    key={`${question.id}-${optionIndex}`}
                    type="button"
                    onClick={() =>
                      setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                    }
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                      isSelected
                        ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    )}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {LETTERS[optionIndex]}
                    </span>
                    <span className="pt-0.5 text-sm leading-relaxed text-slate-700">
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
                disabled={index === 0}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {quiz.questions.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    className={cn(
                      "h-6 w-6 rounded-md text-[10px] font-bold transition",
                      itemIndex === index
                        ? "bg-indigo-600 text-white"
                        : answers[item.id] !== null && answers[item.id] !== undefined
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                    )}
                    aria-label={`Go to question ${itemIndex + 1}`}
                  >
                    {itemIndex + 1}
                  </button>
                ))}
              </div>
              {index === quiz.questions.length - 1 ? (
                <Button size="sm" onClick={() => setConfirmSubmit(true)} disabled={submitting}>
                  Submit <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    setIndex((current) => Math.min(quiz.questions.length - 1, current + 1))
                  }
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>

          <div className="space-y-3">
            <Card className="p-4">
              <p className="text-xs font-semibold text-slate-900">Answer map</p>
              <div className="mt-2 grid grid-cols-6 gap-1.5 lg:grid-cols-5">
                {quiz.questions.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    className={cn(
                      "h-7 rounded-lg text-[10px] font-bold transition",
                      itemIndex === index
                        ? "ring-2 ring-indigo-300 bg-indigo-600 text-white"
                        : answers[item.id] !== null && answers[item.id] !== undefined
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                    )}
                    aria-label={`Question ${itemIndex + 1}`}
                  >
                    {itemIndex + 1}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Green = answered. You can revisit any question before submitting.
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold text-slate-900">Grounded generation</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {quiz.engine === "groq"
                  ? "Questions were generated by Groq and validated against source chunks."
                  : quiz.engine === "extractive"
                    ? "Questions were extracted directly from source sentences because AI generation was unavailable."
                    : "A mix of AI-generated and source-extracted questions was used."}
              </p>
              <div className="mt-2">
                <EngineBadge engine={quiz.engine} />
              </div>
            </Card>
            {quiz.warnings.length ? (
              <Alert tone="warning" title="Generation notes" icon={AlertTriangle}>
                <ul className="list-disc space-y-1 pl-4">
                  {quiz.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
          </div>
        </div>

        <ConfirmDialog
          open={confirmSubmit}
          title="Submit this diagnostic?"
          description={
            answeredCount === quiz.questions.length
              ? "Your answers will be scored and added to your mastery record."
              : `You have answered ${answeredCount} of ${quiz.questions.length} questions. Unanswered questions are scored as incorrect.`
          }
          confirmLabel="Submit and score"
          loading={submitting}
          onConfirm={submit}
          onClose={() => setConfirmSubmit(false)}
        />
      </div>
    );
  }

  if (stage === "results" && result && quiz) {
    const score = result.attempt.scorePercentage;
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Diagnostic complete"
          title="Quiz results"
          subtitle={`${result.attempt.title} · ${formatDuration(result.attempt.durationSeconds)}`}
          actions={
            <>
              <Button variant="secondary" onClick={reset}>
                <RefreshCw className="h-4 w-4" /> New quiz
              </Button>
              <Link href="/gap-analysis" className={buttonClasses("primary", "md")}>
                <ScanSearch className="h-4 w-4" /> View gap analysis
              </Link>
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="flex flex-col items-center justify-center p-6">
            <div
              className="flex h-36 w-36 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(${score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"} ${Math.max(0, Math.min(100, score)) * 3.6}deg, #f1f5f9 0deg)`,
              }}
            >
              <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full bg-white">
                <span className={cn("text-3xl font-bold tracking-tight", scoreTone(score))}>
                  {formatPercent(score)}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  {result.attempt.correctCount}/{result.attempt.totalQuestions} correct
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <EngineBadge engine={result.attempt.engine} />
              <Badge tone="outline" icon={Clock}>{formatDuration(result.attempt.durationSeconds)}</Badge>
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
              {result.planUpdated
                ? "Your revision plan was refreshed to target the topics you missed."
                : "Mastery was updated from this attempt."}
            </p>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <CardHeader
                title="Topic breakdown"
                description="Where this attempt moved the needle"
                icon={Target}
              />
              <div className="mt-3 space-y-2.5">
                {result.topicBreakdown.map((item) => (
                  <div key={item.topicId} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">{item.topicName}</p>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        <span className="text-xs font-bold text-slate-900">
                          {item.correct}/{item.total}
                        </span>
                      </div>
                    </div>
                    <ProgressBar value={item.percentage} className="mt-2 h-1.5" />
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Link href="/revision-plan" className={buttonClasses("secondary", "md")}>
                <CalendarCheck className="h-4 w-4" /> Open revision plan
              </Link>
              <Link href="/progress" className={buttonClasses("secondary", "md")}>
                <ClipboardCheck className="h-4 w-4" /> Track progress
              </Link>
            </div>
          </div>
        </div>

        {result.warnings.length ? (
          <Alert tone="warning" title="Evaluation notes" icon={AlertTriangle}>
            <ul className="list-disc space-y-1 pl-4">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Answer review</h2>
          {result.results.map((item, itemIndex) => {
            const correctAnswer = item.options[item.correctOptionIndex];
            return (
              <Card key={item.questionId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                        item.isCorrect
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-rose-100 text-rose-600",
                      )}
                    >
                      {item.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {itemIndex + 1}. {item.question}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone="outline">{item.topicName}</Badge>
                        <Badge tone="outline">{DIFFICULTY_LABELS[item.difficulty]}</Badge>
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[11px] font-bold",
                      item.isCorrect ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {item.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Your answer
                    </p>
                    <p className="mt-0.5 text-xs text-slate-700">
                      {item.selectedOptionIndex === null
                        ? "Not answered"
                        : `${LETTERS[item.selectedOptionIndex]}. ${item.options[item.selectedOptionIndex]}`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                      Correct answer
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-900">
                      {LETTERS[item.correctOptionIndex]}. {correctAnswer}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Explanation
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {item.explanation}
                  </p>
                  {item.feedback ? (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                      {item.feedback}
                    </p>
                  ) : null}
                </div>

                <SourceList citations={item.citations} className="mt-2" />
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-900">Keep the loop going</p>
            <p className="text-[11px] text-indigo-700">
              Your next quiz will prioritize the topics you missed here.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={reset}>
              Take another quiz
            </Button>
            <Link href="/revision-plan" className={buttonClasses("primary", "sm")}>
              Revision plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert tone="error" title="Quiz state was lost">
        Reload the page to start a new diagnostic.
      </Alert>
      <Button onClick={reset}>
        <ArrowLeft className="h-4 w-4" /> Back to setup
      </Button>
    </div>
  );
}
