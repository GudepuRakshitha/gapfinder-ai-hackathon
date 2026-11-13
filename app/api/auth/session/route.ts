import { buildAuthSession, getSessionStudent } from "@/backend/services/authService";
import { handleApiError, ok } from "@/backend/utils/apiResponse";

export async function GET() {
  try {
    const student = await getSessionStudent();
    if (!student) {
      return ok({ session: null });
    }
    const session = await buildAuthSession(student);
    return ok({ session });
  } catch (error) {
    return handleApiError(error, "auth/session");
  }
}
