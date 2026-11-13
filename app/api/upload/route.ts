import type { Material, MaterialSourceType, UploadResponse } from "@/backend/types";
import { db } from "@/backend/database/databaseQueries";
import { requireStudent } from "@/lib/auth";
import { extractDocument } from "@/backend/services/documentService";
import { buildChunkRecords } from "@/backend/services/ragService";
import { chunkPages, chunkText } from "@/backend/utils/chunkText";
import { newId } from "@/backend/utils/id";
import {
  ValidationError,
  errorMessage,
} from "@/backend/utils/errors";
import { created, handleApiError } from "@/backend/utils/apiResponse";
import {
  ACCEPTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
} from "@/lib/constants";
import { SOURCE_TYPE_OPTIONS } from "@/lib/constants";

export const maxDuration = 60;

const SOURCE_TYPES = new Set(
  SOURCE_TYPE_OPTIONS.map((option) => option.value),
);

function normalizeSourceType(value: FormDataEntryValue | null): MaterialSourceType {
  return typeof value === "string" && SOURCE_TYPES.has(value as MaterialSourceType)
    ? (value as MaterialSourceType)
    : "other";
}

function fileTypeFor(name: string): string | null {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension && (ACCEPTED_FILE_EXTENSIONS as readonly string[]).includes(extension)
    ? extension
    : null;
}

export async function POST(request: Request) {
  const student = await requireStudent().catch((error) => error);
  if (student instanceof Error) {
    return handleApiError(student, "upload");
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("Choose a PDF, DOCX or TXT file to upload.");
    }
    if (file.size === 0) {
      throw new ValidationError("The selected file is empty.");
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `“${file.name}” is larger than the ${MAX_FILE_SIZE_LABEL} limit.`,
      );
    }

    const fileType = fileTypeFor(file.name);
    if (!fileType) {
      throw new ValidationError(
        "Unsupported file type. Upload a PDF, DOCX or TXT document.",
      );
    }

    const sourceType = normalizeSourceType(formData.get("sourceType"));
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractDocument(file.name, fileType, buffer);

    if (!extracted.text.trim()) {
      throw new ValidationError(
        "No readable text was found in this document. Scanned image PDFs need OCR before upload.",
      );
    }

    const timestamp = new Date().toISOString();
    const material: Material = {
      id: newId(),
      studentId: student.id,
      name: file.name,
      fileType: fileType as Material["fileType"],
      sizeBytes: file.size,
      wordCount: extracted.wordCount,
      charCount: extracted.charCount,
      pageCount: extracted.pageCount,
      sourceType,
      status: "processing",
      isDemo: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      extractedText: extracted.text,
    };

    await db.createMaterial(material);

    let chunksCreated = 0;
    try {
      const pieces =
        extracted.pages.some((page) => page.page !== null)
          ? chunkPages(
              extracted.pages.map((page) => ({
                page: page.page ?? 1,
                text: page.text,
              })),
            )
          : chunkText(extracted.text);
      const chunks = buildChunkRecords(material, pieces);
      if (!chunks.length) {
        throw new ValidationError(
          "The document was readable but contained too little prose to index. Add explanatory text and try again.",
        );
      }
      await db.createChunks(chunks);
      chunksCreated = chunks.length;
      await db.updateMaterial(student.id, material.id, {
        status: "ready",
        wordCount: extracted.wordCount,
        charCount: extracted.charCount,
        pageCount: extracted.pageCount,
      });
    } catch (error) {
      await db
        .updateMaterial(student.id, material.id, { status: "failed" })
        .catch(() => undefined);
      throw new ValidationError(
        `“${file.name}” was extracted but could not be indexed: ${errorMessage(error)}`,
      );
    }

    const warnings = [...extracted.warnings];
    if (sourceType === "syllabus") {
      warnings.push(
        "Syllabus uploaded. Run “Analyse topics” to rebuild your topic map from it.",
      );
    }

    const response: UploadResponse = {
      material: {
        id: material.id,
        studentId: material.studentId,
        name: material.name,
        fileType: material.fileType,
        sizeBytes: material.sizeBytes,
        wordCount: material.wordCount,
        charCount: material.charCount,
        pageCount: material.pageCount,
        sourceType: material.sourceType,
        status: "ready",
        isDemo: material.isDemo,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
      },
      chunksCreated,
      pages: extracted.pageCount,
      words: extracted.wordCount,
      warnings,
    };

    return created(response, `“${file.name}” processed and indexed.`);
  } catch (error) {
    return handleApiError(error, "upload");
  }
}
