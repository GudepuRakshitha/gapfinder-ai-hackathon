"use client";

import { useState } from "react";
import type { Citation } from "@/backend/types";
import { SOURCE_TYPE_LABELS } from "@/lib/constants";
import { ChevronDown, FileText, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export function SourceList({
  citations,
  defaultOpen = false,
  compact = false,
  className,
}: {
  citations: Citation[];
  defaultOpen?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!citations.length) return null;

  const unique = citations.filter(
    (citation, index, list) =>
      list.findIndex(
        (item) =>
          item.materialId === citation.materialId &&
          item.page === citation.page &&
          item.section === citation.section &&
          item.chunkId === citation.chunkId,
      ) === index,
  );

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-slate-50/70", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Quote className="h-3.5 w-3.5 text-indigo-500" />
          {unique.length} {unique.length === 1 ? "source" : "sources"}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-slate-400 transition", open && "rotate-180")}
        />
      </button>
      {open ? (
        <ul className="space-y-2 border-t border-slate-200 px-3 py-2.5">
          {unique.map((citation, index) => (
            <li
              key={`${citation.materialId}-${citation.chunkId ?? index}-${index}`}
              className="text-xs"
            >
              <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-800">
                <FileText className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="break-all">{citation.materialName}</span>
                {citation.page ? (
                  <span className="text-slate-500">· page {citation.page}</span>
                ) : null}
                {citation.section ? (
                  <span className="text-slate-500">· {citation.section}</span>
                ) : null}
                {citation.sourceType ? (
                  <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                    {SOURCE_TYPE_LABELS[citation.sourceType]}
                  </span>
                ) : null}
              </div>
              {citation.excerpt && !compact ? (
                <p className="mt-1 border-l-2 border-indigo-200 pl-2 leading-relaxed text-slate-600">
                  “{citation.excerpt}”
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
