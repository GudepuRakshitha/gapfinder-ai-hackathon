import { db } from "@/backend/database/databaseQueries";
import { requireStudent } from "@/lib/auth";
import { seedSampleWorkspace } from "@/backend/services/seedService";
import { handleApiError, ok } from "@/backend/utils/apiResponse";

export const maxDuration = 120;

export async function POST() {
  try {
    const student = await requireStudent();
    const result = await seedSampleWorkspace(student.id);
    await db.updateStudent(student.id, { demoSeeded: true });
    return ok(result, {
      message: result.alreadySeeded
        ? "Sample workspace is already loaded."
        : `Loaded the sample pack: ${result.materialsCreated} materials and ${result.topicsCreated} topics.`,
    });
  } catch (error) {
    return handleApiError(error, "demo/seed");
  }
}
