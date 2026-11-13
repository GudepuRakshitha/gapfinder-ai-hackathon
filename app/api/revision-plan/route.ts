import type { RevisionPlanRequest } from "@/backend/types";
import { requireStudent } from "@/lib/auth";
import {
  generatePlan,
  getPlan,
} from "@/backend/services/revisionService";
import { ValidationError } from "@/backend/utils/errors";
import { handleApiError, ok, readJson } from "@/backend/utils/apiResponse";

export const maxDuration = 60;

export async function GET() {
  try {
    const student = await requireStudent();
    const plan = await getPlan(student.id);
    return ok({ plan });
  } catch (error) {
    return handleApiError(error, "revision-plan/get");
  }
}

export async function POST(request: Request) {
  try {
    const student = await requireStudent();
    const body = await readJson<RevisionPlanRequest>(request);
    if (!body || typeof body !== "object") {
      throw new ValidationError("Choose a number of days and study hours.");
    }
    const plan = await generatePlan(student.id, body);
    return ok(plan, {
      message: `Revision plan generated with ${plan.tasks.length} tasks.`,
    });
  } catch (error) {
    return handleApiError(error, "revision-plan/create");
  }
}
