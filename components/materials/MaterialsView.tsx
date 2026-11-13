"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MaterialSourceType,
  MaterialSummary,
  SeedResult,
  TopicMapResult,
  UploadResponse,
} from "@/backend/types";
import { api, errorToMessage } from "@/lib/api";
import {
  ACCEPTED_FILE_EXTENSIONS,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_OPTIONS,
} from "@/lib/constants";
import { cn, formatBytes, formatDate, formatNumber, relativeTime } from "@/lib/utils";
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
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Eye,
  FileText,
  FileType2,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

interface MaterialsResponse {
  materials: MaterialSummary[];
  chunkCount: number;
  hasMaterials: boolean;
  hasDemoMaterials: boolean;
}

interface MaterialDetailResponse {
  material: MaterialSummary & { extractedText: string };
  chunks: number;
  preview: {
    textPreview: string;
    excerpt: string;
    wordCount: number;
    charCount: number;
    pageCount: number;
  };
}

const ACCEPT = ACCEPTED_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(",");

function validateFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(ACCEPTED_FILE_EXTENSIONS as readonly string[]).includes(extension)) {
    return "Unsupported type. Use PDF, DOCX or TXT.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Larger than ${MAX_FILE_SIZE_LABEL}.`;
  }
  if (file.size === 0) return "The file is empty.";
  return null;
}

export function MaterialsView({ autoSample }: { autoSample: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSampleStarted = useRef(false);

  const [data, setData] = useState<MaterialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sourceType, setSourceType] = useState<MaterialSourceType>("notes");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MaterialSourceType | "all">("all");
  const [preview, setPreview] = useState<MaterialDetailResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaterialSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<MaterialsResponse>("/api/materials", signal);
      setData(result);
      return result;
    } catch (caught) {
      setError(errorToMessage(caught, "Could not load your materials."));
      return null;
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

  const seedSample = useCallback(
    async (silent = false) => {
      setSeeding(true);
      try {
        const result = await api.post<SeedResult>("/api/demo-seed");
        if (!silent) {
          toast.success(
            result.alreadySeeded ? "Sample pack already loaded" : "Sample pack loaded",
            result.alreadySeeded
              ? "Your existing sample material was kept."
              : `${result.materialsCreated} documents and ${result.topicsCreated} topics processed.`,
          );
        }
        if (result.warnings?.length) setUploadWarnings(result.warnings);
        await load();
      } catch (caught) {
        if (!silent) {
          toast.error("Could not load the sample pack", errorToMessage(caught));
        }
      } finally {
        setSeeding(false);
      }
    },
    [load, toast],
  );

  useEffect(() => {
    if (!autoSample || autoSampleStarted.current) return;
    if (!data || data.hasMaterials) return;
    autoSampleStarted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot seed runs after the materials fetch resolves
    seedSample(true);
  }, [autoSample, data, seedSample]);

  const addFiles = (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    const accepted: File[] = [];
    for (const file of files) {
      const problem = validateFile(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        continue;
      }
      accepted.push(file);
    }
    setSelectedFiles((current) => {
      const combined = [...current];
      for (const file of accepted) {
        if (
          combined.length >= MAX_FILES_PER_UPLOAD ||
          combined.some(
            (existing) =>
              existing.name === file.name &&
              existing.size === file.size &&
              existing.lastModified === file.lastModified,
          )
        ) {
          continue;
        }
        combined.push(file);
      }
      if (combined.length === MAX_FILES_PER_UPLOAD && current.length + accepted.length > MAX_FILES_PER_UPLOAD) {
        toast.info("Upload limit", `You can upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`);
      }
      return combined;
    });
  };

  const startUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setUploadWarnings([]);
    const warnings: string[] = [];
    let uploaded = 0;
    let failed = 0;

    for (const file of selectedFiles) {
      setUploadingName(file.name);
      setUploadPercent(0);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceType", sourceType);
      try {
        const result = await api.upload<UploadResponse>("/api/upload", formData, (percent) =>
          setUploadPercent(percent),
        );
        uploaded += 1;
        warnings.push(...result.warnings);
        toast.success("Document indexed", `${file.name} · ${formatNumber(result.words)} words, ${result.chunksCreated} chunks.`);
      } catch (caught) {
        failed += 1;
        toast.error(`Could not process ${file.name}`, errorToMessage(caught));
      }
    }

    setUploadWarnings([...new Set(warnings)]);
    setSelectedFiles([]);
    setUploading(false);
    setUploadingName(null);
    setUploadPercent(0);
    await load();

    if (failed > 0 && uploaded > 0) {
      toast.info(
        "Some files were processed",
        `${uploaded} uploaded, ${failed} failed. Check the messages above.`,
      );
    }
    if (uploaded && sourceType === "syllabus") {
      toast.info("Syllabus uploaded", "Run “Analyse topics” to rebuild your topic map.");
    }
  };

  const analyzeTopics = async () => {
    setAnalyzing(true);
    try {
      const result = await api.post<TopicMapResult>("/api/topics", { applyAI: true });
      toast.success(
        "Topic map updated",
        `${result.topics.length} topics mapped across ${result.subjects.length} subjects.`,
      );
      if (result.warnings.length) {
        toast.info("Analysis notes", result.warnings[0]);
      }
      router.push("/topics");
    } catch (caught) {
      toast.error("Could not analyse topics", errorToMessage(caught));
    } finally {
      setAnalyzing(false);
    }
  };

  const openPreview = async (material: MaterialSummary) => {
    setPreviewLoading(true);
    try {
      const detail = await api.get<MaterialDetailResponse>(`/api/materials/${material.id}`);
      setPreview(detail);
    } catch (caught) {
      toast.error("Could not open material", errorToMessage(caught));
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/materials/${deleteTarget.id}`);
      toast.success("Material deleted", `${deleteTarget.name} was removed from your workspace.`);
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      toast.error("Could not delete material", errorToMessage(caught));
    } finally {
      setDeleting(false);
    }
  };

  const materials = data?.materials ?? [];
  const filtered = materials.filter((material) => {
    if (filter !== "all" && material.sourceType !== filter) return false;
    if (search.trim() && !material.name.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 1 · Sources"
        title="Study materials"
        subtitle="Upload the syllabus, notes and past papers GapFinder should learn from. Text is extracted, chunked and indexed locally in your workspace."
        actions={
          <>
            <Button variant="secondary" onClick={() => seedSample()} loading={seeding}>
              <Sparkles className="h-4 w-4" />
              Load sample pack
            </Button>
            <Button onClick={analyzeTopics} loading={analyzing} disabled={!materials.length}>
              <Layers className="h-4 w-4" />
              {data && data.materials.length ? "Re-analyse topics" : "Analyse topics"}
            </Button>
          </>
        }
      />

      {error ? (
        <Alert tone="error" title="Materials unavailable" icon={AlertTriangle}>
          {error}
        </Alert>
      ) : null}

      {uploadWarnings.length ? (
        <Alert tone="warning" title="Processing notes" icon={AlertTriangle}>
          <ul className="list-disc space-y-1 pl-4">
            {uploadWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="h-fit p-4 lg:sticky lg:top-20">
          <CardHeader
            title="Upload documents"
            description={`PDF, DOCX or TXT · max ${MAX_FILE_SIZE_LABEL} each`}
            icon={UploadCloud}
            action={<Badge tone="outline">{MAX_FILES_PER_UPLOAD} max</Badge>}
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
            className={cn(
              "mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
              dragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-300 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/40",
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm">
              <UploadCloud className="h-5 w-5" />
            </span>
            <p className="mt-3 text-xs font-semibold text-slate-800">
              Drag files here, or choose from your device
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Citations preserve PDF page numbers when available.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={buttonClasses("secondary", "sm", "mt-3")}
            >
              Choose files
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {selectedFiles.length ? (
            <ul className="mt-3 space-y-2">
              {selectedFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.lastModified}`}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500"
                    aria-label={`Remove ${file.name}`}
                    disabled={uploading}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              What kind of material is this?
            </span>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as MaterialSourceType)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              disabled={uploading}
            >
              {SOURCE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">
              {SOURCE_TYPE_OPTIONS.find((option) => option.value === sourceType)?.description}
            </span>
          </label>

          {uploading ? (
            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-indigo-800">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> {uploadingName}
                </span>
                <span>{uploadPercent}%</span>
              </div>
              <ProgressBar value={uploadPercent} className="mt-2 h-1.5" tone="brand" />
              <p className="mt-1.5 text-[10px] text-indigo-600">
                Extracting text and building searchable chunks…
              </p>
            </div>
          ) : null}

          <Button
            onClick={startUpload}
            disabled={!selectedFiles.length}
            loading={uploading}
            className="mt-4 w-full"
          >
            <UploadCloud className="h-4 w-4" />
            Process {selectedFiles.length ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"}` : "files"}
          </Button>

          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              What gets stored
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Extracted text, page references, section headings and chunks. The
              original binary file is not persisted.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Library
                  <span className="ml-2 text-xs font-medium text-slate-400">
                    {materials.length} file{materials.length === 1 ? "" : "s"} · {formatNumber(data?.chunkCount ?? 0)} chunks
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Only your own uploads are shown.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search files"
                    className="w-40 rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </span>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as MaterialSourceType | "all")}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 outline-none focus:border-indigo-400"
                >
                  <option value="all">All types</option>
                  {SOURCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              {loading && !data ? (
                <LoadingBlock label="Loading your library…" />
              ) : !materials.length ? (
                <EmptyState
                  icon={BookOpenCheck}
                  title="No study material yet"
                  description="Upload a syllabus or notes to start, or load the original sample pack to explore the full workflow."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                        <UploadCloud className="h-4 w-4" /> Choose a file
                      </Button>
                      <Button onClick={() => seedSample()} loading={seeding}>
                        <Sparkles className="h-4 w-4" /> Load sample pack
                      </Button>
                    </div>
                  }
                />
              ) : !filtered.length ? (
                <EmptyState
                  icon={Search}
                  title="No documents match this filter"
                  description="Clear the search or choose a different material type."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-2.5">
                  {filtered.map((material) => (
                    <li
                      key={material.id}
                      className="group rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                          <FileType2 className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="max-w-full truncate text-sm font-semibold text-slate-900">
                              {material.name}
                            </p>
                            {material.isDemo ? <Badge tone="brand">Demo source</Badge> : null}
                            {material.status === "failed" ? (
                              <Badge tone="danger">Indexing failed</Badge>
                            ) : material.status === "processing" ? (
                              <Badge tone="warning">Processing</Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <span className="font-medium text-indigo-600">
                              {SOURCE_TYPE_LABELS[material.sourceType]}
                            </span>
                            <span>{material.fileType.toUpperCase()}</span>
                            <span>{formatNumber(material.wordCount)} words</span>
                            {material.pageCount ? <span>{material.pageCount} pages</span> : null}
                            <span>{formatBytes(material.sizeBytes)}</span>
                            <span title={formatDate(material.createdAt)}>
                              Added {relativeTime(material.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openPreview(material)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            aria-label={`Preview ${material.name}`}
                            title="Preview extracted text"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(material)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Delete ${material.name}`}
                            title="Delete material"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {materials.length ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                  <Layers className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-indigo-900">
                    Next: map your topics
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-700">
                    Re-run the analysis whenever you add or delete a document.
                    Topic analysis uses syllabus headings, document structure and
                    past-paper questions.
                  </p>
                </div>
              </div>
              <Button onClick={analyzeTopics} loading={analyzing} size="sm" className="shrink-0">
                <RefreshCw className="h-3.5 w-3.5" />
                Analyse topics
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {previewLoading ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-6 py-5 shadow-xl">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-indigo-600" />
            <p className="mt-2 text-xs text-slate-500">Loading extracted text…</p>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setPreview(null)}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
          />
          <div className="animate-slide-up relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-bold text-slate-900">
                    {preview.material.name}
                  </h2>
                  {preview.material.isDemo ? <Badge tone="brand">Demo source</Badge> : null}
                  <Badge tone="outline">{SOURCE_TYPE_LABELS[preview.material.sourceType]}</Badge>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {formatNumber(preview.preview.wordCount)} words ·{" "}
                  {formatNumber(preview.preview.charCount)} characters ·{" "}
                  {preview.chunks} chunks · {formatDate(preview.material.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Showing the actual extracted text stored for retrieval.
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700">
                {preview.preview.textPreview}
                {preview.material.extractedText.length > preview.preview.textPreview.length
                  ? "\n\n… preview truncated"
                  : ""}
              </pre>
            </div>
            <div className="flex justify-end border-t border-slate-200 p-3">
              <Button variant="secondary" size="sm" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this material?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” and its indexed chunks will be removed. Topic citations referencing it will be pruned. Quiz history is kept.`
            : ""
        }
        confirmLabel="Delete material"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
