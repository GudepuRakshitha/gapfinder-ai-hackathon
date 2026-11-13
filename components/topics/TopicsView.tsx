"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  GapAnalysis,
  StrengthStatus,
  Subject,
  Topic,
  TopicMapResult,
} from "@/backend/types";
import { api, errorToMessage } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  buttonClasses,
} from "@/components/ui";
import { SourceList } from "@/components/shared/SourceList";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { STATUS_META } from "@/lib/constants";
import { cn, formatPercent, relativeTime } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Flame,
  Layers,
  MessageCircleQuestion,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Target,
} from "lucide-react";

interface TopicsResponse {
  subjects: Subject[];
  topics: Topic[];
  materialCount: number;
  hasTopics: boolean;
  status: { aiConfigured: boolean; model: string | null };
}

type SortMode = "priority" | "name" | "mastery";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Importance ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          className={cn(
            "h-3 w-3",
            index <= value ? "fill-amber-400 text-amber-400" : "text-slate-200",
          )}
        />
      ))}
    </span>
  );
}

export function TopicsView() {
  const toast = useToast();
  const [data, setData] = useState<TopicsResponse | null>(null);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StrengthStatus | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [topics, analysis] = await Promise.all([
        api.get<TopicsResponse>("/api/topics", signal),
        api.get<GapAnalysis>("/api/gap-analysis", signal),
      ]);
      setData(topics);
      setGap(analysis);
    } catch (caught) {
      setError(errorToMessage(caught, "Could not load your topic map."));
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

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const result = await api.post<TopicMapResult>("/api/topics", { applyAI: true });
      toast.success(
        "Topic map rebuilt",
        `${result.topics.length} topics · engine: ${result.engine.replace("_", " ")}.`,
      );
      if (result.warnings.length) {
        toast.info("Analysis notes", result.warnings[0]);
      }
      await load();
    } catch (caught) {
      toast.error("Could not analyse topics", errorToMessage(caught));
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleExpanded = (topicId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const performanceMap = useMemo(
    () => new Map((gap?.topics ?? []).map((topic) => [topic.topicId, topic])),
    [gap],
  );

  const filtered = useMemo(() => {
    const topics = data?.topics ?? [];
    const query = search.trim().toLowerCase();
    return topics
      .filter((topic) => {
        if (subjectFilter !== "all" && topic.subjectName !== subjectFilter) return false;
        const performance = performanceMap.get(topic.id);
        if (statusFilter !== "all" && (performance?.status ?? "not_assessed") !== statusFilter) {
          return false;
        }
        if (!query) return true;
        return (
          topic.name.toLowerCase().includes(query) ||
          topic.description.toLowerCase().includes(query) ||
          topic.subtopics.some((subtopic) => subtopic.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (sortMode === "name") return a.name.localeCompare(b.name);
        const aPerf = performanceMap.get(a.id);
        const bPerf = performanceMap.get(b.id);
        if (sortMode === "mastery") {
          return (aPerf?.mastery ?? 0) - (bPerf?.mastery ?? 0);
        }
        const aScore =
          (aPerf?.status === "weak" ? 1000 : aPerf?.status === "not_assessed" ? 700 : 0) +
          a.importance * 40 +
          a.examFrequency * 10 -
          (aPerf?.mastery ?? 0);
        const bScore =
          (bPerf?.status === "weak" ? 1000 : bPerf?.status === "not_assessed" ? 700 : 0) +
          b.importance * 40 +
          b.examFrequency * 10 -
          (bPerf?.mastery ?? 0);
        return bScore - aScore;
      });
  }, [data, search, subjectFilter, statusFilter, sortMode, performanceMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, Topic[]>();
    for (const topic of filtered) {
      const list = map.get(topic.subjectName) ?? [];
      list.push(topic);
      map.set(topic.subjectName, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  if (loading && !data) {
    return <LoadingBlock label="Loading your topic map…" />;
  }

  const subjects = data?.subjects ?? [];
  const topics = data?.topics ?? [];
  const assessed = gap?.assessedTopics ?? 0;
  const weak = gap?.distribution.weak ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 2 · Curriculum"
        title="Topic map"
        subtitle="Every topic detected in your material, with its source references, syllabus importance and past-paper frequency. Mastery comes from your real attempts."
        actions={
          <>
            <Link href="/materials" className={buttonClasses("secondary", "md")}>
              <BookOpen className="h-4 w-4" />
              Materials
            </Link>
            <Button onClick={analyze} loading={analyzing} disabled={!topics.length && !data?.materialCount}>
              <RefreshCw className="h-4 w-4" />
              {topics.length ? "Re-analyse topics" : "Analyse topics"}
            </Button>
          </>
        }
      />

      {error ? (
        <Alert tone="error" title="Topic map unavailable" icon={AlertTriangle}>
          {error}
        </Alert>
      ) : null}

      {!topics.length && !loading ? (
        <Card className="p-6">
          <EmptyState
            icon={Layers}
            title={
              data?.materialCount
                ? "Your material is ready to be mapped"
                : "Upload material before mapping topics"
            }
            description={
              data?.materialCount
                ? "Run the analysis to extract headings, syllabus units, subtopics and past-paper questions into a topic map."
                : "GapFinder needs a syllabus, notes or textbook chapter to discover topics. Load the sample pack if you want to explore first."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/materials" className={buttonClasses("secondary", "md")}>
                  Open materials
                </Link>
                <Button onClick={analyze} loading={analyzing} disabled={!data?.materialCount}>
                  <Sparkles className="h-4 w-4" /> Map topics now
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Topics mapped", value: topics.length, icon: Layers, tone: "brand" },
              { label: "Subjects", value: subjects.length, icon: BookOpen, tone: "neutral" },
              { label: "Assessed", value: `${assessed}/${topics.length}`, icon: ClipboardCheck, tone: "info" },
              { label: "Weak topics", value: weak, icon: Target, tone: "danger" },
            ].map((stat) => (
              <Card key={stat.label} className="flex items-center gap-3 p-3.5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    stat.tone === "danger"
                      ? "bg-rose-50 text-rose-600"
                      : stat.tone === "info"
                        ? "bg-sky-50 text-sky-600"
                        : stat.tone === "neutral"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-indigo-50 text-indigo-600",
                  )}
                >
                  <stat.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-lg font-bold leading-none text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-[10px] font-medium text-slate-500">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <span className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search topics or subtopics…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </span>
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
              >
                <option value="all">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StrengthStatus | "all")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
              >
                <option value="all">All mastery states</option>
                {(["weak", "medium", "strong", "not_assessed"] as StrengthStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
              >
                <option value="priority">Sort: priority</option>
                <option value="mastery">Sort: lowest mastery</option>
                <option value="name">Sort: name</option>
              </select>
            </div>
          </Card>

          {!grouped.length ? (
            <EmptyState
              icon={Search}
              title="No topics match these filters"
              description="Try a different subject, mastery state or search term."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSubjectFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              {grouped.map(([subjectName, subjectTopics]) => (
                <section key={subjectName}>
                  <div className="mb-2.5 flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight text-slate-900">
                      {subjectName}
                    </h2>
                    <Badge tone="outline">{subjectTopics.length} topics</Badge>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {subjectTopics.map((topic) => {
                      const performance = performanceMap.get(topic.id);
                      const isOpen = expanded.has(topic.id);
                      return (
                        <Card key={topic.id} className="p-4 transition hover:shadow-md">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="text-sm font-semibold text-slate-900">
                                  {topic.name}
                                </h3>
                                {topic.aiEnhanced ? (
                                  <Badge tone="brand" icon={Sparkles}>AI enhanced</Badge>
                                ) : null}
                                <StatusBadge status={performance?.status ?? "not_assessed"} />
                              </div>
                              <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
                                {topic.description}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <Stars value={topic.importance} />
                              <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                                <Flame className="h-3 w-3 text-orange-400" />
                                {topic.examFrequency} past-paper match
                                {topic.examFrequency === 1 ? "" : "es"}
                              </p>
                            </div>
                          </div>

                          {performance ? (
                            <div className="mt-3 flex items-center gap-2">
                              <ProgressBar value={performance.mastery} className="h-1.5" />
                              <span className="w-9 text-right text-[11px] font-semibold text-slate-600">
                                {formatPercent(performance.mastery)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {performance.attempted} answered
                              </span>
                            </div>
                          ) : null}

                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {topic.subtopics.slice(0, isOpen ? 10 : 4).map((subtopic) => (
                              <span
                                key={subtopic}
                                className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                              >
                                {subtopic}
                              </span>
                            ))}
                            {!isOpen && topic.subtopics.length > 4 ? (
                              <span className="px-1 py-1 text-[10px] text-slate-400">
                                +{topic.subtopics.length - 4} more
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/quiz?topicId=${encodeURIComponent(topic.id)}`}
                              className={buttonClasses("primary", "sm")}
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" /> Quiz this topic
                            </Link>
                            <Link
                              href={`/tutor?topicId=${encodeURIComponent(topic.id)}`}
                              className={buttonClasses("secondary", "sm")}
                            >
                              <MessageCircleQuestion className="h-3.5 w-3.5" /> Ask tutor
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleExpanded(topic.id)}
                              className={buttonClasses("ghost", "sm", "ml-auto")}
                              aria-expanded={isOpen}
                            >
                              {isOpen ? "Less" : "Sources"}
                              <ChevronDown className={cn("h-3.5 w-3.5 transition", isOpen && "rotate-180")} />
                            </button>
                          </div>

                          {isOpen ? (
                            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                              {topic.pastPaperQuestions.length ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                                  <p className="text-[11px] font-semibold text-amber-900">
                                    Matched past-paper questions
                                  </p>
                                  <ul className="mt-1.5 space-y-1.5">
                                    {topic.pastPaperQuestions.slice(0, 5).map((question, index) => (
                                      <li key={`${question.materialId}-${index}`} className="text-[11px] leading-relaxed text-amber-800">
                                        “{question.question}”
                                        <span className="ml-1 text-[10px] text-amber-600">
                                          — {question.materialName}
                                          {question.year ? `, ${question.year}` : ""}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              <SourceList citations={topic.citations} defaultOpen />
                              {performance?.recommendedAction ? (
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                                  <p className="text-[11px] font-semibold text-indigo-900">
                                    Recommended action
                                  </p>
                                  <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-800">
                                    {performance.recommendedAction}
                                  </p>
                                </div>
                              ) : null}
                              <p className="text-[10px] text-slate-400">
                                Updated {relativeTime(topic.updatedAt)}
                              </p>
                            </div>
                          ) : null}
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {gap?.warnings.length ? (
            <Alert tone="warning" title="Analysis notes" icon={AlertTriangle}>
              <ul className="list-disc space-y-1 pl-4">
                {gap.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Target className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-900">Ready to diagnose?</p>
                <p className="text-[11px] text-slate-500">
                  Take a diagnostic to attach real evidence to these topics.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/quiz" className={buttonClasses("primary", "sm")}>
                Start diagnostic <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/gap-analysis" className={buttonClasses("secondary", "sm")}>
                Gap analysis
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
