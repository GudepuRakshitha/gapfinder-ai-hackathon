import { buildAuthSession, loginStudent } from "@/backend/services/authService";
import { handleApiError, ok, readJson } from "@/backend/utils/apiResponse";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email?: unknown; password?: unknown }>(request);
    const result = await loginStudent(body.email, body.password);
    const session = await buildAuthSession(result.student);
    return ok(session, {
      message: "Signed in.",
      meta: { warnings: result.warnings },
    });
  } catch (error) {
    return handleApiError(error, "auth/login");
  }
}
