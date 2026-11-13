import { requireStudent } from "@/lib/auth";
import { buildProgressData } from "@/backend/services/progressService";
import { handleApiError, ok } from "@/backend/utils/apiResponse";

export const maxDuration = 60;

export async function GET() {
  try {
    const student = await requireStudent();
    const data = await buildProgressData(student.id);
    return ok(data);
  } catch (error) {
    return handleApiError(error, "progress");
  }
}
