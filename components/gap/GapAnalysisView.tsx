"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { GapAnalysis, StrengthStatus } from "@/backend/types";
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
import { SourceList } from "@/components/shared/SourceList";
import { STATUS_META } from "@/lib/constants";
import { cn, formatPercent } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  ChevronDown,
  ClipboardCheck,
  Flame,
  Layers,
  Lightbulb,
  MessageCircleQuestion,
  RefreshCw,
  ScanSearch,
  Sparkles,
  Target,
  TrendingDown,
  Trophy,
} from "lucide-react";

export function GapAnalysisView() {
  const { session } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StrengthStatus | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async (withAI = false, signal?: AbortSignal) => {
    if (withAI) setAiLoading(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await api.get<GapAnalysis>(
        `/api/gap-analysis${withAI ? "?ai=1" : ""}`,
        signal,
      );
      setData(result);
      if (withAI) {
        toast.success(
          result.aiEnhanced ? "AI insight generated" : "Insight refreshed",
          result.aiEnhanced
            ? "The diagnostic narrative was written by the configured AI model."
            : "A rule-based narrative is shown because AI generation was unavailable.",
        );
      }
    } catch (caught) {
      const message = errorToMessage(caught, "Could not load the gap analysis.");
      setError(message);
      if (withAI) toast.error("Could not generate the insight", message);
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state changes only after the awaited API response
    load(false, controller.signal);
    return () => controller.abort();
  }, [load]);

  const toggleExpanded = (topicId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const filteredTopics = useMemo(() => {
    if (!data) return [];
    return data.topics.filter(
      (topic) => statusFilter === "all" || topic.status === statusFilter,
    );
  }, [data, statusFilter]);

  if (loading && !data) {
    return <LoadingBlock label="Building your gap analysis…" />;
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Knowledge gap analysis" />
        <Alert tone="error" title="Analysis unavailable">
          {error}
        </Alert>
        <Button onClick={() => load()}>Try again</Button>
      </div>
    );
  }

  if (!data) return null;

  if (!data.totalTopics) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Step 4 · Diagnosis"
          title="Knowledge gap analysis"
          subtitle="Diagnosis needs a mapped topic list and at least one submitted diagnostic."
        />
        <Card className="p-6">
          <EmptyState
            icon={Layers}
            title="No topics to analyse yet"
            description="Upload your syllabus or notes, map the topics, then take a diagnostic quiz. GapFinder only diagnoses from evidence it actually has."
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
        </Card>
      </div>
    );
  }

  const insight = data.insight;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 4 · Diagnosis"
        title="Knowledge gap analysis"
        subtitle="Built only from submitted quiz answers, mapped topics, past-paper frequency and your source citations."
        actions={
          <>
            <Button variant="secondary" onClick={() => load()} loading={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button
              onClick={() => load(true)}
              loading={aiLoading}
              disabled={!session.groqConfigured}
              title={
                session.groqConfigured
                  ? "Generate a narrative with the configured Groq model"
                  : "Set GROQ_API_KEY to enable AI narratives"
              }
            >
              <Sparkles className="h-4 w-4" /> Generate AI insight
            </Button>
          </>
        }
      />

      {!session.groqConfigured ? (
        <Alert tone="info" title="Rule-based insight mode" icon={BrainCircuit}>
          AI narrative generation needs <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-[10px]">GROQ_API_KEY</code>.
          The analysis below is still calculated from your real answers.
        </Alert>
      ) : null}

      {data.warnings.length ? (
        <Alert tone="warning" title="Analysis notes" icon={AlertTriangle}>
          <ul className="list-disc space-y-1 pl-4">
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Overall mastery"
          value={formatPercent(data.overallMastery)}
          hint={`${data.assessedTopics} of ${data.totalTopics} topics assessed`}
          icon={Trophy}
          tone={data.overallMastery >= 75 ? "success" : data.overallMastery >= 50 ? "warning" : "danger"}
        />
        <StatCard
          label="Weak topics"
          value={data.distribution.weak}
          hint="Below 50% mastery"
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard
          label="Unassessed"
          value={data.distribution.notAssessed}
          hint="No quiz evidence yet"
          icon={ScanSearch}
          tone="neutral"
        />
        <StatCard
          label="Incorrect concepts"
          value={data.frequentlyIncorrectConcepts.length}
          hint="Topics with repeated misses"
          icon={Target}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="p-4">
          <CardHeader title="Mastery distribution" description="All mapped topics" icon={Target} />
          <MasteryDonut
            distribution={data.distribution}
            overallMastery={data.overallMastery}
            assessed={data.assessedTopics}
            total={data.totalTopics}
          />
          <DistributionLegend distribution={data.distribution} />
          <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
            Weak &lt; 50%, medium 50–74%, strong ≥ 75%. Unassessed topics are
            excluded from overall mastery.
          </p>
        </Card>

        <Card className="p-4">
          <CardHeader
            title="Diagnostic narrative"
            description={`Engine: ${insight.engine === "groq" ? "Groq · Llama" : "rule-based analysis"}`}
            icon={Lightbulb}
            action={
              <Badge tone={insight.engine === "groq" ? "brand" : "neutral"}>
                {insight.engine === "groq" ? "AI narrative" : "Rule-based"}
              </Badge>
            }
          />
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {insight.summary}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Patterns detected
              </p>
              <ul className="mt-2 space-y-1.5">
                {insight.patterns.map((pattern) => (
                  <li key={pattern} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                Recommended next actions
              </p>
              <ul className="mt-2 space-y-1.5">
                {insight.recommendations.map((recommendation) => (
                  <li key={recommendation} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-indigo-900">
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {data.frequentlyIncorrectConcepts.length ? (
        <Card className="p-4">
          <CardHeader
            title="Frequently incorrect concepts"
            description="Built from the questions you actually missed"
            icon={ClipboardCheck}
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.frequentlyIncorrectConcepts.map((concept) => (
              <div
                key={`${concept.topicId}-${concept.topicName}`}
                className="rounded-xl border border-rose-100 bg-rose-50/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900">{concept.topicName}</p>
                  <Badge tone="danger">
                    {concept.missedCount} miss{concept.missedCount === 1 ? "" : "es"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={concept.topicMastery} className="h-1.5" />
                  <span className="w-9 text-right text-[10px] font-semibold text-slate-600">
                    {formatPercent(concept.topicMastery)}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {concept.examples.slice(0, 2).map((example, index) => (
                    <li key={`${example.question}-${index}`} className="text-[10px] leading-relaxed text-slate-600">
                      · {example.question}
                    </li>
                  ))}
                </ul>
                {concept.topicId ? (
                  <Link
                    href={`/quiz?topicId=${encodeURIComponent(concept.topicId)}`}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Re-test this topic <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader
            title="Topic-by-topic diagnosis"
            description={`${filteredTopics.length} topics shown`}
            icon={ScanSearch}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StrengthStatus | "all")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-400"
          >
            <option value="all">All mastery states</option>
            {(["weak", "medium", "strong", "not_assessed"] as StrengthStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label} ({data.distribution[status === "not_assessed" ? "notAssessed" : status]})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-2.5">
          {filteredTopics.map((topic) => {
            const isOpen = expanded.has(topic.topicId);
            return (
              <div
                key={topic.topicId}
                className={cn(
                  "rounded-xl border p-3.5 transition",
                  topic.status === "weak"
                    ? "border-rose-200 bg-rose-50/30"
                    : topic.status === "medium"
                      ? "border-amber-200 bg-amber-50/20"
                      : "border-slate-200 bg-white",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-900">{topic.topicName}</p>
                      <StatusBadge status={topic.status} />
                      {topic.examFrequency > 0 ? (
                        <Badge tone="warning" icon={Flame}>
                          {topic.examFrequency} exam match{topic.examFrequency === 1 ? "" : "es"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {topic.subjectName} · importance {topic.importance}/5 ·{" "}
                      {topic.attempted > 0
                        ? `${topic.correct}/${topic.attempted} correct`
                        : "not assessed yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <ProgressBar value={topic.mastery} className="h-1.5" />
                    </div>
                    <span className="w-9 text-right text-xs font-bold text-slate-900">
                      {formatPercent(topic.mastery)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-inset ring-slate-200">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-rose-500">
                      Why it is weak
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                      {topic.weaknessReason}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-inset ring-slate-200">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600">
                      Recommended action
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                      {topic.recommendedAction}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/quiz?topicId=${encodeURIComponent(topic.topicId)}`}
                    className={buttonClasses("primary", "sm")}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" /> Re-test
                  </Link>
                  <Link
                    href={`/tutor?topicId=${encodeURIComponent(topic.topicId)}`}
                    className={buttonClasses("secondary", "sm")}
                  >
                    <MessageCircleQuestion className="h-3.5 w-3.5" /> Ask tutor
                  </Link>
                  {topic.citations.length ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(topic.topicId)}
                      className={buttonClasses("ghost", "sm", "ml-auto")}
                      aria-expanded={isOpen}
                    >
                      Sources <ChevronDown className={cn("h-3.5 w-3.5 transition", isOpen && "rotate-180")} />
                    </button>
                  ) : null}
                </div>

                {isOpen ? (
                  <div className="mt-2.5 space-y-2">
                    <SourceList citations={topic.citations} defaultOpen />
                    {topic.subtopics.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {topic.subtopics.map((subtopic) => (
                          <span
                            key={subtopic}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600"
                          >
                            {subtopic}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-indigo-900">Turn this diagnosis into a schedule</p>
          <p className="text-[11px] text-indigo-700">
            The revision plan weights weak topics by importance and exam frequency.
          </p>
        </div>
        <Link href="/revision-plan" className={buttonClasses("primary", "sm")}>
          Build revision plan <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
