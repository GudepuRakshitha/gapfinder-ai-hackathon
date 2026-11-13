import { db } from "@/backend/database/databaseQueries";
import { requireStudent } from "@/lib/auth";
import {
  buildTopicMap,
  getTopicMappingStatus,
} from "@/backend/services/topicService";
import { handleApiError, ok, readJson } from "@/backend/utils/apiResponse";

export const maxDuration = 60;

export async function GET() {
  try {
    const student = await requireStudent();
    const [subjects, topics, materials] = await Promise.all([
      db.listSubjects(student.id),
      db.listTopics(student.id),
      db.listMaterials(student.id),
    ]);
    return ok({
      subjects,
      topics,
      materialCount: materials.length,
      hasTopics: topics.length > 0,
      status: getTopicMappingStatus(),
    });
  } catch (error) {
    return handleApiError(error, "topics/list");
  }
}

export async function POST(request: Request) {
  try {
    const student = await requireStudent();
    let applyAI = true;
    try {
      const body = await readJson<{ applyAI?: unknown }>(request);
      applyAI = body.applyAI !== false;
    } catch {
      // An empty body is valid: analyse with AI when available.
    }
    const result = await buildTopicMap(student.id, { applyAI });
    return ok(result, {
      message: `${result.topics.length} topics mapped from your material.`,
    });
  } catch (error) {
    return handleApiError(error, "topics/analyze");
  }
}
