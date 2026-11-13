import type { GenerateQuizRequest } from "@/backend/types";
import { requireStudent } from "@/lib/auth";
import { generateQuiz, getQuizStatus } from "@/backend/services/quizService";
import { handleApiError, ok, readJson } from "@/backend/utils/apiResponse";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const student = await requireStudent();
    let body: GenerateQuizRequest = {};
    try {
      body = await readJson<GenerateQuizRequest>(request);
    } catch {
      // Defaults are valid: 5 mixed questions from the weakest topics.
    }
    const result = await generateQuiz(student.id, body);
    return ok(result, {
      message: `Generated ${result.questions.length} grounded questions.`,
      meta: { quizStatus: getQuizStatus() },
    });
  } catch (error) {
    return handleApiError(error, "quiz/generate");
  }
}
