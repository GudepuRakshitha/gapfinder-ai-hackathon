import { logoutStudent } from "@/backend/services/authService";
import { handleApiError, ok } from "@/backend/utils/apiResponse";

export async function POST() {
  try {
    await logoutStudent();
    return ok({ signedOut: true }, { message: "Signed out." });
  } catch (error) {
    return handleApiError(error, "auth/logout");
  }
}
