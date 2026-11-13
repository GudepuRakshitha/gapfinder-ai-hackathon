import { buildAuthSession, signupStudent } from "@/backend/services/authService";
import { handleApiError, ok, readJson } from "@/backend/utils/apiResponse";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      fullName?: unknown;
      email?: unknown;
      password?: unknown;
    }>(request);
    const result = await signupStudent(body);
    const session = result.student
      ? await buildAuthSession(result.student)
      : null;
    return ok(
      { session, requiresConfirmation: result.requiresConfirmation },
      {
        status: 201,
        message: result.message ?? "Account created.",
      },
    );
  } catch (error) {
    return handleApiError(error, "auth/signup");
  }
}
