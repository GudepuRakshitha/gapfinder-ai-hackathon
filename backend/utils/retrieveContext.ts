import type { DocumentChunk } from "@/backend/types";
import { stem, stemmedTokens, tokenize } from "@/backend/utils/text";

export interface RetrievedChunk {
  chunk: DocumentChunk;
  score: number;
  matchedTerms: string[];
}

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
  materialIds?: string[];
  includeWeakMatches?: boolean;
}

function termFrequency(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token, (map.get(token) ?? 0) + 1);
  }
  return map;
}

/**
 * TF-IDF cosine retrieval over document chunks.
 *
 * This is genuine lexical retrieval (not embeddings). Section headings and
 * material names are part of the indexed text and receive a small boost so
 * "Photosynthesis" matches a chapter heading even when the body only says
 * "the process".
 */
export function retrieveContext(
  chunks: DocumentChunk[],
  query: string,
  options: RetrievalOptions = {},
): RetrievedChunk[] {
  const topK = Math.max(1, options.topK ?? 6);
  const minScore = options.minScore ?? 0;
  const includeWeak = options.includeWeakMatches ?? true;

  const allowed = options.materialIds?.length
    ? chunks.filter((chunk) => options.materialIds!.includes(chunk.materialId))
    : chunks;

  if (!allowed.length) return [];

  const queryTokens = tokenize(query);
  const queryStems = [...new Set(queryTokens.map(stem))];
  if (!queryStems.length) return [];

  const documents = allowed.map((chunk) => {
    const sectionTokens = stemmedTokens(chunk.section ?? "");
    const bodyTokens = stemmedTokens(`${chunk.materialName} ${chunk.content}`);
    // Section headings carry more signal than a passing mention.
    const tokens = [...bodyTokens, ...sectionTokens, ...sectionTokens];
    return {
      chunk,
      tokens,
      tf: termFrequency(tokens),
      sectionSet: new Set(sectionTokens),
      normalizedContent: chunk.content.toLowerCase().replace(/\s+/g, " "),
    };
  });

  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    for (const term of new Set(document.tokens)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const idf = (term: string) =>
    Math.log((documents.length + 1) / ((documentFrequency.get(term) ?? 0) + 1)) +
    1;

  const queryTf = termFrequency(queryStems);
  const queryWeights = new Map<string, number>();
  for (const [term, count] of queryTf) {
    queryWeights.set(term, (1 + Math.log(count)) * idf(term));
  }
  const queryNorm = Math.sqrt(
    [...queryWeights.values()].reduce((sum, value) => sum + value * value, 0),
  );
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, " ").trim();

  const scored = documents.map((document) => {
    let dot = 0;
    const matched: string[] = [];
    for (const [term, weight] of queryWeights) {
      const tf = document.tf.get(term);
      if (tf) {
        dot += weight * (1 + Math.log(tf)) * idf(term);
        matched.push(term);
      }
    }

    const docNorm = Math.sqrt(
      [...document.tf.entries()].reduce((sum, [term, count]) => {
        const weight = (1 + Math.log(count)) * idf(term);
        return sum + weight * weight;
      }, 0),
    );

    let score = queryNorm > 0 && docNorm > 0 ? dot / (queryNorm * docNorm) : 0;

    if (document.sectionSet.size) {
      const sectionMatches = queryStems.filter((term) =>
        document.sectionSet.has(term),
      ).length;
      score += (sectionMatches / queryStems.length) * 0.12;
    }

    if (
      normalizedQuery.length >= 8 &&
      document.normalizedContent.includes(normalizedQuery)
    ) {
      score += 0.15;
    }

    return {
      chunk: document.chunk,
      score,
      matchedTerms: [...new Set(matched)],
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const filtered = sorted.filter((item) => item.score >= minScore);

  if (!filtered.length && includeWeak) {
    return sorted.slice(0, Math.min(topK, 2));
  }

  return filtered.slice(0, topK);
}

/** Merge retrieval result batches, keeping the highest score per chunk. */
export function mergeRetrieved(
  batches: RetrievedChunk[][],
  topK = 8,
): RetrievedChunk[] {
  const map = new Map<string, RetrievedChunk>();
  for (const batch of batches) {
    for (const item of batch) {
      const existing = map.get(item.chunk.id);
      if (!existing || item.score > existing.score) map.set(item.chunk.id, item);
    }
  }
  return [...map.values()].sort((a, b) => b.score - a.score).slice(0, topK);
}
