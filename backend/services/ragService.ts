import type {
  Citation,
  DocumentChunk,
  Material,
  MaterialSourceType,
  Topic,
} from "@/backend/types";
import type { ChunkPiece } from "@/backend/utils/chunkText";
import {
  mergeRetrieved,
  retrieveContext,
  type RetrievedChunk,
} from "@/backend/utils/retrieveContext";
import { snippetAround } from "@/backend/utils/text";
import { db } from "@/backend/database/databaseQueries";
import { newId } from "@/backend/utils/id";

export interface LabeledSource {
  label: string;
  chunk: DocumentChunk;
  citation: Citation;
}

export interface RagContext {
  text: string;
  sources: LabeledSource[];
  truncated: boolean;
}

export interface RagStatus {
  method: string;
  chunkSize: number;
  overlap: number;
  description: string;
}

export const RAG_STATUS: RagStatus = {
  method: "TF-IDF cosine similarity over document chunks",
  chunkSize: 950,
  overlap: 140,
  description:
    "Lexical retrieval over chunks extracted from your uploaded files. Section headings and material names are indexed as well as body text. No embeddings or external vector database are used.",
};

export function citationFromChunk(
  chunk: DocumentChunk,
  query?: string,
): Citation {
  return {
    materialId: chunk.materialId,
    materialName: chunk.materialName,
    chunkId: chunk.id,
    page: chunk.page,
    section: chunk.section,
    sourceType: chunk.sourceType,
    excerpt: snippetAround(chunk.content, query ?? chunk.section ?? "", 220),
  };
}

/** Build persisted chunk records for a processed material. */
export function buildChunkRecords(
  material: Material,
  pieces: ChunkPiece[],
): DocumentChunk[] {
  const createdAt = new Date().toISOString();
  return pieces.map((piece, index) => ({
    id: newId(),
    materialId: material.id,
    studentId: material.studentId,
    chunkIndex: index,
    content: piece.content,
    page: piece.page,
    section: piece.section,
    sourceType: material.sourceType as MaterialSourceType,
    materialName: material.name,
    wordCount: piece.wordCount,
    createdAt,
  }));
}

export async function loadStudentChunks(
  studentId: string,
  materialIds?: string[],
): Promise<DocumentChunk[]> {
  return db.listChunks(studentId, materialIds);
}

export async function retrieveForTopic(
  studentId: string,
  topic: Pick<
    Topic,
    "id" | "name" | "description" | "subtopics" | "subjectName" | "materialIds"
  >,
  options: { topK?: number; minScore?: number } = {},
): Promise<RetrievedChunk[]> {
  const chunks = await loadStudentChunks(studentId, topic.materialIds);
  const query = [
    topic.name,
    topic.subjectName,
    topic.description,
    ...topic.subtopics,
  ]
    .filter(Boolean)
    .join(" ");

  return retrieveContext(chunks, query, {
    topK: options.topK ?? 6,
    minScore: options.minScore ?? 0.01,
    includeWeakMatches: true,
  });
}

export async function retrieveForQuery(
  studentId: string,
  query: string,
  options: {
    topK?: number;
    minScore?: number;
    materialIds?: string[];
    includeWeakMatches?: boolean;
  } = {},
): Promise<RetrievedChunk[]> {
  const chunks = await loadStudentChunks(studentId, options.materialIds);
  return retrieveContext(chunks, query, {
    topK: options.topK ?? 5,
    minScore: options.minScore ?? 0.03,
    includeWeakMatches: options.includeWeakMatches ?? false,
  });
}

export async function retrieveForConversation(
  studentId: string,
  topic: Pick<
    Topic,
    "id" | "name" | "description" | "subtopics" | "subjectName" | "materialIds"
  >,
  message: string,
): Promise<RetrievedChunk[]> {
  const topicResults = await retrieveForTopic(studentId, topic, {
    topK: 4,
    minScore: 0.05,
  });
  const messageResults = await retrieveForQuery(
    studentId,
    `${topic.name} ${message}`,
    {
      topK: 4,
      minScore: 0.03,
      materialIds: topic.materialIds,
      includeWeakMatches: false,
    },
  );
  return mergeRetrieved([messageResults, topicResults], 5);
}

/**
 * Label retrieved chunks for an LLM prompt.
 * Labels are also used in the response citations shown to the student.
 */
export function buildLabeledContext(
  retrieved: RetrievedChunk[],
  options: { perChunkChars?: number; maxChars?: number; query?: string } = {},
): RagContext {
  const perChunk = options.perChunkChars ?? 1400;
  const maxChars = options.maxChars ?? 11_000;
  const sources: LabeledSource[] = [];
  let text = "";
  let truncated = false;

  for (const item of retrieved) {
    const label = `S${sources.length + 1}`;
    const content = item.chunk.content;
    const clipped =
      content.length > perChunk ? `${content.slice(0, perChunk)}…` : content;
    const block = `[${label}] Material: ${item.chunk.materialName} | ${
      item.chunk.page ? `Page ${item.chunk.page}` : "No page"
    } | Section: ${item.chunk.section ?? "Unlabelled"}\n${clipped}\n`;

    if (text.length + block.length > maxChars) {
      truncated = true;
      break;
    }
    text += `\n${block}`;
    sources.push({
      label,
      chunk: item.chunk,
      citation: citationFromChunk(item.chunk, options.query),
    });
  }

  return { text: text.trim(), sources, truncated };
}

/** De-duplicate citations by material + page + section. */
export function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = [
      citation.materialId,
      citation.page ?? "",
      citation.section ?? "",
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
