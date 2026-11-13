import { db } from "@/backend/database/databaseQueries";
import { requireStudent } from "@/lib/auth";
import {
  askTutor,
  clearTutorHistory,
  getTutorHistory,
  suggestionsForTopic,
} from "@/backend/services/tutorService";
import { isGroqConfigured, getGroqModel } from "@/backend/services/groqService";
import { ValidationError } from "@/backend/utils/errors";
import { handleApiError, ok, readJson } from "@/backend/utils/apiResponse";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const student = await requireStudent();
    const topicId = new URL(request.url).searchParams.get("topicId");
    if (!topicId) throw new ValidationError("Choose a topic to view the tutor.");
    const [messages, topic] = await Promise.all([
      getTutorHistory(student.id, topicId),
      db.getTopic(student.id, topicId),
    ]);
    return ok({
      messages,
      topic,
      suggestions: topic ? suggestionsForTopic(topic.subtopics, topic.name) : [],
      aiConfigured: isGroqConfigured(),
      model: isGroqConfigured() ? getGroqModel() : null,
    });
  } catch (error) {
    return handleApiError(error, "tutor/history");
  }
}

export async function POST(request: Request) {
  try {
    const student = await requireStudent();
    const body = await readJson<{ topicId?: unknown; message?: unknown }>(request);
    const response = await askTutor(student.id, {
      topicId: body.topicId,
      message: body.message,
    });
    return ok(response);
  } catch (error) {
    return handleApiError(error, "tutor/ask");
  }
}

export async function DELETE(request: Request) {
  try {
    const student = await requireStudent();
    const topicId = new URL(request.url).searchParams.get("topicId");
    if (!topicId) throw new ValidationError("Choose a topic to clear.");
    await clearTutorHistory(student.id, topicId);
    return ok({ cleared: true }, { message: "Tutor history cleared." });
  } catch (error) {
    return handleApiError(error, "tutor/clear");
  }
}
