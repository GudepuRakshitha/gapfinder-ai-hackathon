import type { EvaluateRequest } from "@/backend/types";
import { requireStudent } from "@/lib/auth";
import { evaluateAttempt } from "@/backend/services/evaluationService";
import { ValidationError } from "@/backend/utils/errors";
import { handleApiError, ok, readJson } from "@/backend/utils/apiResponse";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const student = await requireStudent();
    const body = await readJson<EvaluateRequest>(request);
    if (!body || typeof body.attemptId !== "string" || !body.attemptId) {
      throw new ValidationError("A quiz attempt id is required.");
    }
    if (!Array.isArray(body.answers)) {
      throw new ValidationError("Answers must be an array.");
    }
    const result = await evaluateAttempt(student.id, body);
    return ok(result, {
      message: `Scored ${result.results.length} answers.`,
    });
  } catch (error) {
    return handleApiError(error, "quiz/evaluate");
  }
}
