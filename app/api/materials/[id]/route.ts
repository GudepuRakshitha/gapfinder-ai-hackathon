import { db } from "@/backend/database/databaseQueries";
import { requireStudent } from "@/lib/auth";
import { pruneDeletedMaterial } from "@/backend/services/topicService";
import { snippetAround } from "@/backend/utils/text";
import {
  NotFoundError,
  ValidationError,
} from "@/backend/utils/errors";
import { handleApiError, ok } from "@/backend/utils/apiResponse";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/materials/[id]">,
) {
  try {
    const student = await requireStudent();
    const { id } = await ctx.params;
    const material = await db.getMaterial(student.id, id);
    if (!material) throw new NotFoundError("Study material not found.");
    const chunks = await db.listChunks(student.id, [material.id]);
    return ok({
      material,
      chunks: chunks.length,
      preview: {
        textPreview: material.extractedText.slice(0, 4000),
        excerpt: snippetAround(material.extractedText, "", 320),
        wordCount: material.wordCount,
        charCount: material.charCount,
        pageCount: material.pageCount,
      },
    });
  } catch (error) {
    return handleApiError(error, "materials/get");
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/materials/[id]">,
) {
  try {
    const student = await requireStudent();
    const { id } = await ctx.params;
    if (!id) throw new ValidationError("Material id is required.");
    const material = await db.getMaterial(student.id, id);
    if (!material) throw new NotFoundError("Study material not found.");

    await db.deleteChunksForMaterial(student.id, id);
    await db.deleteMaterial(student.id, id);
    await pruneDeletedMaterial(student.id, id);

    return ok({ deleted: true }, { message: `“${material.name}” deleted.` });
  } catch (error) {
    return handleApiError(error, "materials/delete");
  }
}
