"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChatMessage, Topic, TutorResponse } from "@/backend/types";
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
  buttonClasses,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EngineBadge } from "@/components/shared/EngineBadge";
import { SourceList } from "@/components/shared/SourceList";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Layers,
  Loader2,
  MessageCircleQuestion,
  Send,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

interface TopicsResponse {
  topics: Topic[];
  hasTopics: boolean;
  materialCount: number;
}

interface HistoryResponse {
  messages: ChatMessage[];
  topic: Topic | null;
  suggestions: string[];
  aiConfigured: boolean;
  model: string | null;
}

export function TutorView({ initialTopicId }: { initialTopicId?: string }) {
  const toast = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState(initialTopicId ?? "");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [topicLoading, setTopicLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const localMessageId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setTopicLoading(true);
      try {
        const response = await api.get<TopicsResponse>("/api/topics", controller.signal);
        setTopics(response.topics);
        setTopicId((current) => {
          if (current && response.topics.some((topic) => topic.id === current)) return current;
          return response.topics[0]?.id ?? "";
        });
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(errorToMessage(caught, "Could not load topics."));
      } finally {
        setTopicLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const loadHistory = useCallback(
    async (id: string, signal?: AbortSignal) => {
      if (!id) {
        setMessages([]);
        return;
      }
      setHistoryLoading(true);
      setError(null);
      setWarning(null);
      try {
        const response = await api.get<HistoryResponse>(
          `/api/tutor?topicId=${encodeURIComponent(id)}`,
          signal,
        );
        setMessages(response.messages);
        setSuggestions(response.suggestions);
        setAiConfigured(response.aiConfigured);
      } catch (caught) {
        if (signal?.aborted) return;
        setError(errorToMessage(caught, "Could not load tutor history."));
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!topicId) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state changes only after the awaited API response
    loadHistory(topicId, controller.signal);
    return () => controller.abort();
  }, [topicId, loadHistory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const send = async (override?: string) => {
    const message = (override ?? input).trim();
    if (!message || !topicId || sending) return;
    if (message.length > 1200) {
      toast.error("Question too long", "Keep your question under 1200 characters.");
      return;
    }
    setSending(true);
    setError(null);
    setWarning(null);
    setInput("");
    localMessageId.current += 1;
    const optimistic: ChatMessage = {
      id: `local-${localMessageId.current}`,
      studentId: "",
      topicId,
      role: "user",
      content: message,
      citations: [],
      engine: "rule_based",
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    try {
      const response = await api.post<TutorResponse>("/api/tutor", { topicId, message });
      setMessages((current) => [...current, response.message]);
      if (response.warning) setWarning(response.warning);
    } catch (caught) {
      const messageText = errorToMessage(caught, "The tutor could not answer.");
      setError(messageText);
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setInput(message);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    if (!topicId) return;
    setClearing(true);
    setConfirmClear(false);
    try {
      await api.delete(`/api/tutor?topicId=${encodeURIComponent(topicId)}`);
      setMessages([]);
      toast.success("Tutor history cleared", "You can start a new conversation on this topic.");
    } catch (caught) {
      toast.error("Could not clear history", errorToMessage(caught));
    } finally {
      setClearing(false);
    }
  };

  if (topicLoading) {
    return <LoadingBlock label="Loading your tutor workspace…" />;
  }

  if (!topics.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Step 6 · Tutor"
          title="AI tutor"
          subtitle="Ask questions grounded in your own uploaded material."
        />
        <Card className="p-6">
          <EmptyState
            icon={Layers}
            title="No topics available yet"
            description="The tutor answers with citations from indexed chunks. Upload and map your study material first."
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

  const selected = topics.find((topic) => topic.id === topicId) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Step 6 · Tutor"
        title="AI tutor"
        subtitle="Answers are grounded in retrieved chunks from your own material. If the sources do not cover something, the tutor says so."
        actions={
          <>
            <Badge tone={aiConfigured ? "brand" : "neutral"} icon={Sparkles}>
              {aiConfigured ? "Groq explanations" : "Retrieval-only mode"}
            </Badge>
            <Button
              variant="secondary"
              onClick={() => setConfirmClear(true)}
              disabled={!messages.length || clearing}
            >
              <Trash2 className="h-4 w-4" /> Clear history
            </Button>
          </>
        }
      />

      {!aiConfigured ? (
        <Alert tone="info" title="Explanations are in retrieval-only mode" icon={BookOpen}>
          Set <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-[10px]">GROQ_API_KEY</code>{" "}
          to generate explanations. Without it, the tutor still retrieves the most
          relevant source excerpts and never invents an answer.
        </Alert>
      ) : null}

      {warning ? (
        <Alert tone="warning" title="Answer note" icon={AlertTriangle}>
          {warning}
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="error" title="Tutor error">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <Card className="p-3.5">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Topic context
              </span>
              <select
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.subjectName} · {topic.name}
                  </option>
                ))}
              </select>
            </label>
            {selected ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-900">
                  {selected.name}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  {selected.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selected.subtopics.slice(0, 6).map((subtopic) => (
                    <span
                      key={subtopic}
                      className="rounded-md bg-white px-1.5 py-0.5 text-[9px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                    >
                      {subtopic}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{selected.citations.length} cited source{selected.citations.length === 1 ? "" : "s"}</span>
                  <Link
                    href={`/quiz?topicId=${encodeURIComponent(selected.id)}`}
                    className="font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Quiz this topic
                  </Link>
                </div>
              </div>
            ) : null}
          </Card>

          {suggestions.length ? (
            <Card className="p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Suggested questions
              </p>
              <div className="mt-2 space-y-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    disabled={sending}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] leading-snug text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <MessageCircleQuestion className="h-3 w-3" /> Grounding rules
            </p>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-slate-500">
              <li>· Answers use only retrieved source excerpts.</li>
              <li>· Every claim must carry a source citation.</li>
              <li>· Missing coverage is reported, not guessed.</li>
              <li>· Instructions inside documents are ignored.</li>
            </ul>
          </Card>
        </div>

        <Card className="flex min-h-[560px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-900">GapFinder tutor</p>
                <p className="text-[10px] text-slate-500">
                  {selected ? `Context: ${selected.name}` : "Choose a topic to begin"}
                </p>
              </div>
            </div>
            <Badge tone={aiConfigured ? "brand" : "info"} icon={aiConfigured ? Sparkles : BookOpen}>
              {aiConfigured ? "Grounded AI" : "Source excerpts"}
            </Badge>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/40 p-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10 text-xs text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading conversation…
              </div>
            ) : !messages.length ? (
              <div className="mx-auto max-w-md py-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Ask about {selected?.name ?? "this topic"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  I will search your uploaded material and answer with citations. If
                  the material does not cover it, I will tell you instead of guessing.
                </p>
                {suggestions.length ? (
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {suggestions.slice(0, 3).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => send(suggestion)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        isUser
                          ? "bg-slate-200 text-slate-600"
                          : "brand-gradient text-white",
                      )}
                    >
                      {isUser ? <UserRound className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </span>
                    <div className={cn("max-w-[85%] min-w-0", isUser && "text-right")}>
                      <div
                        className={cn(
                          "inline-block rounded-2xl px-3.5 py-2.5 text-left text-xs leading-relaxed shadow-sm",
                          isUser
                            ? "rounded-tr-sm bg-indigo-600 text-white"
                            : "rounded-tl-sm border border-slate-200 bg-white text-slate-700",
                        )}
                      >
                        <p className="prose-answer">{message.content}</p>
                      </div>
                      <div className={cn("mt-1 flex flex-wrap items-center gap-1.5", isUser && "justify-end")}>
                        <span className="text-[9px] text-slate-400">
                          {formatDateTime(message.createdAt)}
                        </span>
                        {!isUser ? <EngineBadge engine={message.engine} /> : null}
                      </div>
                      {!isUser && message.citations.length ? (
                        <SourceList citations={message.citations} className="mt-1.5 text-left" />
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            {sending ? (
              <div className="flex items-start gap-2.5">
                <span className="brand-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white">
                  <Bot className="h-3.5 w-3.5" />
                </span>
                <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                    </span>
                    Searching your sources…
                  </span>
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                rows={2}
                maxLength={1200}
                disabled={sending || !topicId}
                placeholder={
                  selected
                    ? `Ask about ${selected.name}… (Enter to send, Shift+Enter for a new line)`
                    : "Choose a topic first"
                }
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              />
              <Button
                onClick={() => send()}
                disabled={!input.trim() || !topicId}
                loading={sending}
                aria-label="Send question"
                className="h-[44px] shrink-0"
              >
                <Send className="h-4 w-4" />
                Ask
              </Button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-0.5">
              <p className="text-[9px] text-slate-400">
                Answers come only from your material. No general knowledge is used.
              </p>
              <span className="text-[9px] text-slate-400">{input.length}/1200</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-slate-500">
          Want a structured check instead of a conversation? A diagnostic quiz
          measures mastery directly.
        </p>
        <div className="flex gap-2">
          <Link href={`/quiz${selected ? `?topicId=${encodeURIComponent(selected.id)}` : ""}`} className={buttonClasses("primary", "sm")}>
            Take a quiz
          </Link>
          <Link href="/gap-analysis" className={buttonClasses("secondary", "sm")}>
            Gap analysis
          </Link>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear this conversation?"
        description="The chat history for this topic will be deleted. This does not affect your quiz attempts or mastery."
        confirmLabel="Clear history"
        destructive
        loading={clearing}
        onConfirm={clearHistory}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
