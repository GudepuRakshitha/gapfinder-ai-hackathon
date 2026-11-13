import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { DocumentError } from "@/backend/utils/errors";
import {
  normalizeText,
  wordCount,
} from "@/backend/utils/text";

export interface ExtractedPage {
  page: number | null;
  text: string;
}

export interface ExtractedDocument {
  text: string;
  pages: ExtractedPage[];
  pageCount: number;
  charCount: number;
  wordCount: number;
  warnings: string[];
}

const SUPPORTED_TYPES = new Set(["pdf", "docx", "txt"]);

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_match, number: string) =>
      String.fromCodePoint(Number(number)),
    );
}

/** Convert mammoth's HTML into readable text while retaining heading lines. */
export function htmlToText(html: string): string {
  const converted = html
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, _level, inner: string) => {
      const clean = decodeHtmlEntities(inner.replace(/<[^>]+>/g, " ")).replace(
        /\s+/g,
        " ",
      );
      return `\n\n${clean}\n\n`;
    })
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/(p|div|tr|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n");

  return normalizeText(decodeHtmlEntities(converted));
}

function validateText(text: string, kind: string): string {
  const cleaned = normalizeText(text);
  if (cleaned.length < 40) {
    throw new DocumentError(
      `No readable text was found in this ${kind}. If it is a scanned document, run OCR first or upload a text-based version.`,
      422,
      "NO_EXTRACTABLE_TEXT",
    );
  }
  return cleaned;
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const pages = (result.pages ?? [])
      .map((page) => ({
        page: page.num,
        text: normalizeText(page.text ?? ""),
      }))
      .filter((page) => page.text.length > 0);

    const text = validateText(
      pages.length ? pages.map((page) => page.text).join("\n\n") : result.text,
      "PDF",
    );

    return {
      text,
      pages: pages.length ? pages : [{ page: 1, text }],
      pageCount: result.total ?? pages.length,
      charCount: text.length,
      wordCount: wordCount(text),
      warnings: pages.length === 0 ? ["PDF page boundaries were unavailable; page citations use page 1."] : [],
    };
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (/password|encrypted/i.test(message)) {
      throw new DocumentError(
        "This PDF is password-protected. Remove the password and upload it again.",
        422,
        "PDF_ENCRYPTED",
      );
    }
    if (/invalid pdf|structure|corrupt/i.test(message)) {
      throw new DocumentError(
        "This PDF appears to be corrupted or is not a valid PDF file.",
        422,
        "PDF_CORRUPTED",
      );
    }
    throw new DocumentError(
      `The PDF could not be processed${message ? `: ${message}` : "."}`,
      422,
      "PDF_PARSE_FAILED",
    );
  } finally {
    if (parser) {
      await parser.destroy().catch(() => undefined);
    }
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    const text = validateText(htmlToText(result.value), "DOCX document");
    return {
      text,
      pages: [{ page: null, text }],
      pageCount: 0,
      charCount: text.length,
      wordCount: wordCount(text),
      warnings: (result.messages ?? [])
        .filter((message) => message.type === "warning")
        .slice(0, 3)
        .map((message) => message.message),
    };
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError(
      `This DOCX file could not be read. It may be corrupted or password-protected. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
      422,
      "DOCX_PARSE_FAILED",
    );
  }
}

function extractTxt(buffer: Buffer): ExtractedDocument {
  const decoded = buffer.toString("utf-8");
  const replacementCount = (decoded.match(/\uFFFD/g) ?? []).length;
  if (decoded && replacementCount / decoded.length > 0.02) {
    throw new DocumentError(
      "This text file does not appear to be UTF-8 encoded. Save it as UTF-8 and try again.",
      422,
      "TXT_ENCODING",
    );
  }
  const text = validateText(decoded, "text file");
  return {
    text,
    pages: [{ page: null, text }],
    pageCount: 0,
    charCount: text.length,
    wordCount: wordCount(text),
    warnings: [],
  };
}

/**
 * Extract clean text from a PDF, DOCX or TXT buffer.
 * PDF extraction preserves per-page text so citations can include page numbers.
 */
export async function extractDocument(
  fileName: string,
  fileType: string,
  buffer: Buffer,
): Promise<ExtractedDocument> {
  const type = fileType.toLowerCase().replace(/^\./, "");
  if (!SUPPORTED_TYPES.has(type)) {
    throw new DocumentError(
      "Unsupported file type. Upload a PDF, DOCX or TXT document.",
      415,
      "UNSUPPORTED_FILE_TYPE",
    );
  }
  if (!buffer.length) {
    throw new DocumentError("The uploaded file is empty.", 400, "EMPTY_FILE");
  }
  if (type === "pdf") return extractPdf(buffer);
  if (type === "docx") return extractDocx(buffer);
  return extractTxt(buffer);
}

export function buildExtractionPreview(document: ExtractedDocument): {
  textPreview: string;
  pageCount: number;
  wordCount: number;
  charCount: number;
  pages: { page: number | null; chars: number; preview: string }[];
} {
  return {
    textPreview: document.text.slice(0, 2400),
    pageCount: document.pageCount,
    wordCount: document.wordCount,
    charCount: document.charCount,
    pages: document.pages.slice(0, 12).map((page) => ({
      page: page.page,
      chars: page.text.length,
      preview: page.text.slice(0, 280),
    })),
  };
}

export function documentKindLabel(fileName: string): string {
  const extension = fileName.split(".").pop()?.toUpperCase();
  return extension ?? "Document";
}
