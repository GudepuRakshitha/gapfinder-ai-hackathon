import type { Student } from "@/backend/types";
import {
  getAuthMode,
  getSessionStudent,
} from "@/backend/services/authService";
import { AuthError } from "@/backend/utils/errors";

export { getSessionStudent, getAuthMode };

/**
 * Server-side guard for API route handlers. Throws a typed AuthError which the
 * shared route error handler converts to a 401 response.
 */
export async function requireStudent(): Promise<Student> {
  const student = await getSessionStudent();
  if (!student) {
    throw new AuthError();
  }
  return student;
}
