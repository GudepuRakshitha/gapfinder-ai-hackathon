import { requireStudent } from "@/lib/auth";
import { buildGapAnalysis } from "@/backend/services/gapAnalysisService";
import { handleApiError, ok } from "@/backend/utils/apiResponse";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const student = await requireStudent();
    const withAI = new URL(request.url).searchParams.get("ai") === "1";
    const analysis = await buildGapAnalysis(student.id, { withAI });
    return ok(analysis);
  } catch (error) {
    return handleApiError(error, "gap-analysis");
  }
}
