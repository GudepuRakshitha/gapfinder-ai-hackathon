import type { Material, SeedResult } from "@/backend/types";
import { db } from "@/backend/database/databaseQueries";
import { SAMPLE_PACK } from "@/backend/data/samplePack";
import { extractDocument } from "@/backend/services/documentService";
import { buildTopicMap } from "@/backend/services/topicService";
import { buildChunkRecords } from "@/backend/services/ragService";
import { chunkText } from "@/backend/utils/chunkText";
import { newId } from "@/backend/utils/id";
import { wordCount } from "@/backend/utils/text";
import { errorMessage } from "@/backend/utils/errors";

/**
 * Ingest the bundled sample pack through the real extraction → chunking →
 * topic-mapping pipeline. This is not a mock dataset: the material is processed
 * exactly like an upload, and every record is flagged as demo content.
 */
export async function seedSampleWorkspace(
  studentId: string,
): Promise<SeedResult> {
  const existing = await db.listMaterials(studentId);
  const existingNames = new Set(existing.map((material) => material.name));
  const missing = SAMPLE_PACK.filter(
    (document) => !existingNames.has(document.name),
  );
  const warnings: string[] = [];
  let materialsCreated = 0;
  let chunksCreated = 0;

  if (!missing.length) {
    // Recover a workspace where the sample material exists but the topic map
    // was cleared (for example by an earlier failed analysis).
    const topics = await db.listTopics(studentId);
    if (!topics.length) {
      try {
        const result = await buildTopicMap(studentId, { applyAI: false });
        warnings.push(...result.warnings);
        return {
          materialsCreated: 0,
          chunksCreated: 0,
          topicsCreated: result.topics.length,
          alreadySeeded: true,
          warnings,
        };
      } catch (error) {
        warnings.push(
          `Sample material already exists, but topic mapping failed: ${errorMessage(error)}`,
        );
      }
    }
    return {
      materialsCreated: 0,
      chunksCreated: 0,
      topicsCreated: topics.length,
      alreadySeeded: true,
      warnings,
    };
  }

  for (const document of missing) {
    const timestamp = new Date().toISOString();
    const buffer = Buffer.from(document.content, "utf-8");
    try {
      const extracted = await extractDocument(
        document.name,
        "txt",
        buffer,
      );
      const material: Material = {
        id: newId(),
        studentId,
        name: document.name,
        fileType: "txt",
        sizeBytes: buffer.byteLength,
        wordCount: wordCount(extracted.text),
        charCount: extracted.charCount,
        pageCount: 0,
        sourceType: document.sourceType,
        status: "processing",
        isDemo: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        extractedText: extracted.text,
      };
      await db.createMaterial(material);

      try {
        const pieces = chunkText(extracted.text);
        const chunks = buildChunkRecords(material, pieces);
        await db.createChunks(chunks);
        await db.updateMaterial(studentId, material.id, {
          status: "ready",
          wordCount: extracted.wordCount,
          charCount: extracted.charCount,
          pageCount: extracted.pageCount,
        });
        materialsCreated += 1;
        chunksCreated += chunks.length;
        warnings.push(...extracted.warnings);
      } catch (error) {
        await db
          .updateMaterial(studentId, material.id, { status: "failed" })
          .catch(() => undefined);
        warnings.push(
          `“${document.name}” was extracted but could not be indexed: ${errorMessage(error)}`,
        );
      }
    } catch (error) {
      warnings.push(
        `“${document.name}” could not be processed: ${errorMessage(error)}`,
      );
    }
  }

  let topicsCreated = 0;
  if (materialsCreated > 0 || (await db.listTopics(studentId)).length === 0) {
    try {
      const result = await buildTopicMap(studentId, { applyAI: false });
      topicsCreated = result.topics.length;
      warnings.push(...result.warnings);
    } catch (error) {
      warnings.push(
        `Sample material was loaded, but topic mapping failed: ${errorMessage(error)}`,
      );
    }
  } else {
    topicsCreated = (await db.listTopics(studentId)).length;
  }

  return {
    materialsCreated,
    chunksCreated,
    topicsCreated,
    alreadySeeded: false,
    warnings: [...new Set(warnings)],
  };
}

export async function ensureDemoWorkspace(
  studentId: string,
): Promise<SeedResult> {
  return seedSampleWorkspace(studentId);
}
