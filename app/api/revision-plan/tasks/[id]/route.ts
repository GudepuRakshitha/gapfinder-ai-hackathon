import { requireStudent } from "@/lib/auth";
import { toggleTask } from "@/backend/services/revisionService";
import { ValidationError } from "@/backend/utils/errors";
import { handleApiError, ok, readJson } from "@/backend/utils/apiResponse";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/revision-plan/tasks/[id]">,
) {
  try {
    const student = await requireStudent();
    const { id } = await ctx.params;
    const body = await readJson<{ completed?: unknown }>(request);
    if (!id) throw new ValidationError("Task id is required.");
    if (typeof body.completed !== "boolean") {
      throw new ValidationError("`completed` must be true or false.");
    }
    const task = await toggleTask(student.id, id, body.completed);
    return ok(
      { task },
      {
        message: body.completed ? "Task marked complete." : "Task reopened.",
      },
    );
  } catch (error) {
    return handleApiError(error, "revision-plan/task");
  }
}
