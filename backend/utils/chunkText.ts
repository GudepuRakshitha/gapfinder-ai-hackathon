import {
  cleanHeading,
  isGenericSection,
  looksLikeHeading,
  normalizeText,
  wordCount,
} from "@/backend/utils/text";

export interface ChunkPiece {
  content: string;
  section: string | null;
  page: number | null;
  chunkIndex: number;
  wordCount: number;
}

export interface ChunkOptions {
  targetChars?: number;
  overlapChars?: number;
  page?: number | null;
  sectionHint?: string | null;
  startIndex?: number;
}

interface Block {
  type: "heading" | "body";
  text: string;
}

const DEFAULT_TARGET = 950;
const DEFAULT_OVERLAP = 140;
const MIN_CHUNK_WORDS = 8;

function toBlocks(text: string): Block[] {
  const lines = normalizeText(text).split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const value = paragraph.join(" ").replace(/\s+/g, " ").trim();
    if (value) blocks.push({ type: "body", text: value });
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    if (looksLikeHeading(line)) {
      flushParagraph();
      blocks.push({ type: "heading", text: line });
      continue;
    }

    // Keep bullet points as separate logical units for cleaner chunks.
    if (/^[•\-*]\s+/.test(line)) {
      flushParagraph();
      paragraph.push(line);
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}

function splitLongText(text: string, target: number): string[] {
  const pieces: string[] = [];
  let remaining = text.trim();

  while (remaining.length > target) {
    const window = remaining.slice(0, target);
    const sentenceBreak = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
    );
    const spaceBreak = window.lastIndexOf(" ");
    const cut =
      sentenceBreak > target * 0.5
        ? sentenceBreak + 1
        : spaceBreak > target * 0.6
          ? spaceBreak
          : target;
    pieces.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) pieces.push(remaining);
  return pieces.filter(Boolean);
}

function tailOverlap(text: string, overlap: number): string {
  if (overlap <= 0) return "";
  const tail = text.slice(-overlap);
  const firstSpace = tail.indexOf(" ");
  return firstSpace === -1 ? "" : tail.slice(firstSpace + 1).trim();
}

/**
 * Split extracted text into retrieval-sized chunks while preserving the
 * nearest heading as the section label. Page numbers are passed through from
 * the document extractor.
 */
export function chunkText(text: string, options: ChunkOptions = {}): ChunkPiece[] {
  const target = Math.max(400, options.targetChars ?? DEFAULT_TARGET);
  const overlap = Math.min(
    Math.max(0, options.overlapChars ?? DEFAULT_OVERLAP),
    Math.floor(target / 3),
  );
  const page = options.page ?? null;

  let section: string | null =
    options.sectionHint && !isGenericSection(options.sectionHint)
      ? options.sectionHint
      : null;
  let chunkSection = section;
  let chunkIndex = options.startIndex ?? 0;
  let buffer = "";
  const chunks: ChunkPiece[] = [];

  const emit = (content: string, chunkPage: number | null, chunkSectionValue: string | null) => {
    const clean = content.replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").trim();
    if (!clean) return;
    if (wordCount(clean) < MIN_CHUNK_WORDS && clean.length < 45) return;
    const preceding = chunks[chunks.length - 1];
    if (preceding && preceding.content === clean) return;
    chunks.push({
      content: clean,
      section: chunkSectionValue,
      page: chunkPage,
      chunkIndex: chunkIndex++,
      wordCount: wordCount(clean),
    });
  };

  const flush = (keepOverlap: boolean) => {
    const clean = buffer.trim();
    if (!clean) {
      buffer = "";
      return;
    }
    if (clean.length <= target) {
      emit(clean, page, chunkSection);
      buffer = keepOverlap ? tailOverlap(clean, overlap) : "";
      return;
    }

    const pieces = splitLongText(clean, target);
    for (let index = 0; index < pieces.length; index += 1) {
      const piece = pieces[index];
      const content =
        index > 0 && overlap > 0
          ? `${tailOverlap(pieces[index - 1], overlap)} ${piece}`.trim()
          : piece;
      emit(content, page, chunkSection);
    }
    buffer = keepOverlap ? tailOverlap(pieces[pieces.length - 1] ?? "", overlap) : "";
  };

  for (const block of toBlocks(text)) {
    if (block.type === "heading") {
      flush(false);
      const heading = cleanHeading(block.text);
      if (heading && !isGenericSection(heading)) {
        section = heading;
        chunkSection = heading;
        // Seed the next chunk with its heading so retrieved passages are
        // self-describing even without the original document structure.
        buffer = `${heading}\n`;
      } else {
        chunkSection = section;
      }
      continue;
    }

    const addition = block.text.trim();
    if (!addition) continue;

    if (buffer.length + addition.length + 2 > target && buffer.trim()) {
      flush(true);
    }

    if (addition.length > target * 1.4) {
      const pieces = splitLongText(addition, target);
      for (const piece of pieces) {
        if (buffer.length + piece.length + 2 > target && buffer.trim()) flush(true);
        buffer = `${buffer}${buffer ? "\n\n" : ""}${piece}`;
      }
    } else {
      buffer = `${buffer}${buffer ? "\n\n" : ""}${addition}`;
    }
  }

  flush(false);
  return chunks;
}

export interface PageInput {
  page: number;
  text: string;
}

/**
 * Chunk a paginated document (PDF), carrying section headings across pages.
 */
export function chunkPages(
  pages: PageInput[],
  options: Omit<ChunkOptions, "page" | "startIndex"> = {},
): ChunkPiece[] {
  const chunks: ChunkPiece[] = [];
  let sectionHint: string | null = options.sectionHint ?? null;

  for (const page of pages) {
    const pageChunks = chunkText(page.text, {
      ...options,
      page: page.page,
      sectionHint,
      startIndex: chunks.length,
    });
    if (pageChunks.length) {
      sectionHint = pageChunks[pageChunks.length - 1].section ?? sectionHint;
      chunks.push(...pageChunks);
    }
  }

  return chunks.map((chunk, index) => ({ ...chunk, chunkIndex: index }));
}
