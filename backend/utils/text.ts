const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves also using used use may might must can could will would shall should one two three however therefore thus etc within among across per via figure table chapter unit section page pages marks answer question questions explain describe state define give name list outline discuss compare difference between following true false according above below`.split(
    /\s+/,
  ),
);

const GENERIC_SECTIONS = new Set(
  `contents table of contents index references bibliography preface foreword acknowledgements acknowledgments introduction overview summary conclusion appendix glossary objectives learning outcomes instructions marks section a section b section c section d general notes answer all questions time allowed total marks`.split(
    /\s+/,
  ),
);

export function normalizeText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const sentences = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“'(])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  return sentences.length ? sentences : [normalized];
}

export function stem(token: string): string {
  const value = token;
  if (value.length > 4 && value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.length > 5 && value.endsWith("sses")) return value.slice(0, -2);
  if (value.length > 6 && value.endsWith("ing")) return value.slice(0, -3);
  if (value.length > 5 && value.endsWith("ed")) return value.slice(0, -2);
  if (value.length > 5 && value.endsWith("ly")) return value.slice(0, -2);
  if (value.length > 4 && value.endsWith("s") && !value.endsWith("ss")) {
    return value.slice(0, -1);
  }
  return value;
}

export function tokenize(text: string, keepStopwords = false): string[] {
  const raw = text
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .match(/[a-z0-9]+(?:[-–][a-z0-9]+)*/g);
  if (!raw) return [];
  return raw.filter((token) => {
    if (token.length < 3) return false;
    if (!keepStopwords && STOPWORDS.has(token)) return false;
    if (/^\d+$/.test(token)) return false;
    return true;
  });
}

export function stemmedTokens(text: string): string[] {
  return tokenize(text).map(stem);
}

export function isGenericSection(section: string): boolean {
  const normalized = section
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return true;
  if (GENERIC_SECTIONS.has(normalized)) return true;
  if (/^page\s*\d+$/.test(normalized)) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (normalized.length < 3) return true;
  return false;
}

export function cleanHeading(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(
      /^(unit|chapter|module|section|part|topic|lesson)\s+[0-9ivxlc]+(?:[.:\-–]\d+)*\s*[:\-–.]?\s*/i,
      "",
    )
    .replace(/^\d+(?:\.\d+)*[.)]?\s+/, "")
    .replace(/^[•\-–*]\s+/, "")
    .replace(/[:\s]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length < 3 || trimmed.length > 110) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length > 14) return false;
  if (/^[•\-*]\s+/.test(trimmed)) return false;

  const numbered =
    /^(unit|chapter|module|section|part|topic|lesson)\s+[0-9ivxlc]+/i.test(
      trimmed,
    ) || /^\d+(?:\.\d+)*[.)]?\s+\S/.test(trimmed);
  const allCaps =
    /^[A-Z0-9][A-Z0-9\s&/,'’\-–:()]+$/.test(trimmed) &&
    trimmed.replace(/[^A-Za-z]/g, "").length >= 3;
  const titleCaseWords = trimmed
    .split(/\s+/)
    .filter((word) => /^[A-Z][a-z]/.test(word) || /^[A-Z]{2,}$/.test(word));
  const titleCase =
    titleCaseWords.length >= 2 &&
    titleCaseWords.length / trimmed.split(/\s+/).length >= 0.5;
  const colonHeading = trimmed.endsWith(":") && trimmed.length <= 70;

  return numbered || allCaps || titleCase || colonHeading;
}

export function isOutlineBullet(line: string): boolean {
  return /^\s*(?:[•\-–*]|\d+(?:\.\d+)*[.)]|[a-z][.)])\s+/i.test(line);
}

export interface OutlineEntry {
  title: string;
  level: number;
  subtopics: string[];
}

/**
 * Extract a best-effort outline from a syllabus or structured document.
 * Handles numbered headings, bullet sub-points and indented lists.
 */
export function extractOutline(text: string): OutlineEntry[] {
  const lines = normalizeText(text).split("\n");
  const entries: OutlineEntry[] = [];
  let current: OutlineEntry | null = null;
  let currentHeadingLevel = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const indent = rawLine.length - rawLine.trimStart().length;
    const bullet = isOutlineBullet(line);
    const heading = looksLikeHeading(line) && !bullet;
    const numberedLevel = /^(\d+(?:\.\d+)*)[.)]?\s+\S/.exec(line)?.[1];
    const level = numberedLevel
      ? numberedLevel.split(".").length
      : Math.min(3, Math.floor(indent / 2) + 1);

    // Nested numbered items and bullets become subtopics of the current topic.
    if (current && (bullet || (heading && level > currentHeadingLevel))) {
      const cleaned = cleanHeading(line.replace(/^[a-z][.)]\s+/i, ""));
      if (
        cleaned.length >= 3 &&
        cleaned.length <= 90 &&
        !/^\d+$/.test(cleaned) &&
        !isGenericSection(cleaned)
      ) {
        if (!current.subtopics.some((item) => sameText(item, cleaned))) {
          if (current.subtopics.length < 10) current.subtopics.push(cleaned);
        }
      }
      if (bullet) continue;
    }

    if (heading) {
      const cleaned = cleanHeading(line);
      if (
        cleaned.length >= 3 &&
        cleaned.length <= 100 &&
        !isGenericSection(cleaned) &&
        !/^\d+$/.test(cleaned)
      ) {
        if (
          current &&
          (sameText(current.title, cleaned) || cleaned.length < 3)
        ) {
          currentHeadingLevel = level;
          continue;
        }
        current = { title: cleaned, level, subtopics: [] };
        currentHeadingLevel = level;
        entries.push(current);
      }
    } else if (current && line.length >= 12 && line.length <= 140) {
      // A short paragraph after a heading often describes a sub-point.
      const colon = /^([A-Z][^:]{2,60}):/.exec(line);
      if (colon && current.subtopics.length < 10) {
        const cleaned = cleanHeading(colon[1]);
        if (cleaned && !isGenericSection(cleaned)) {
          if (!current.subtopics.some((item) => sameText(item, cleaned))) {
            current.subtopics.push(cleaned);
          }
        }
      }
    }
  }

  // Remove near-duplicate headings caused by page headers / repeated titles.
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sameText(a: string, b: string): boolean {
  return (
    a.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() ===
    b.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  );
}

export function extractKeyTerms(
  text: string,
  limit = 12,
  existing?: string[],
): string[] {
  const counts = new Map<string, { count: number; original: string }>();
  const originalWords = text.match(/[A-Za-z][A-Za-z-]{2,}/g) ?? [];
  const originalByLower = new Map<string, string>();
  for (const word of originalWords) {
    const lower = word.toLowerCase();
    if (!originalByLower.has(lower)) originalByLower.set(lower, word);
  }

  for (const token of tokenize(text)) {
    const key = stem(token);
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else {
      counts.set(key, {
        count: 1,
        original: originalByLower.get(token) ?? token,
      });
    }
  }

  const existingLower = new Set((existing ?? []).map((term) => term.toLowerCase()));
  return [...counts.entries()]
    .filter(([key]) => !existingLower.has(key.toLowerCase()))
    .sort((a, b) => {
      const scoreA = a[1].count * (1 + a[0].length / 24);
      const scoreB = b[1].count * (1 + b[0].length / 24);
      return scoreB - scoreA;
    })
    .slice(0, limit)
    .map(([, entry]) => capitalize(entry.original));
}

export function capitalize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function snippetAround(
  text: string,
  query: string,
  maxLength = 240,
): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const terms = tokenize(query).map((term) => term.toLowerCase());
  const lower = clean.toLowerCase();
  let index = -1;
  for (const term of terms) {
    const found = lower.indexOf(term);
    if (found !== -1 && (index === -1 || found < index)) index = found;
  }
  if (index === -1) index = 0;
  const start = Math.max(0, index - Math.floor(maxLength * 0.3));
  const end = Math.min(clean.length, start + maxLength);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < clean.length ? "…" : "";
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}

export function extractYear(value: string): number | null {
  const match = /(?:19|20)\d{2}/.exec(value);
  if (!match) return null;
  const year = Number(match[0]);
  return year >= 1990 && year <= 2100 ? year : null;
}

export function truncate(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function bulletSafe(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(value.trim());
  }
  return output;
}
