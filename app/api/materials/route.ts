import { db } from "@/backend/database/databaseQueries";
import { requireStudent } from "@/lib/auth";
import { handleApiError, ok } from "@/backend/utils/apiResponse";

export async function GET() {
  try {
    const student = await requireStudent();
    const [materials, chunkCount] = await Promise.all([
      db.listMaterials(student.id),
      db.countChunks(student.id),
    ]);
    return ok({
      materials,
      chunkCount,
      hasMaterials: materials.length > 0,
      hasDemoMaterials: materials.some((material) => material.isDemo),
    });
  } catch (error) {
    return handleApiError(error, "materials/list");
  }
}
