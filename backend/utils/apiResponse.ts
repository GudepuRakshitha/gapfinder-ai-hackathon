import { NextResponse } from "next/server";
import type { ApiFailure } from "@/backend/types";
import {
  toErrorPayload,
  AuthError,
  ValidationError,
} from "@/backend/utils/errors";

export function ok<T>(
  data: T,
  init?: { message?: string; meta?: Record<string, unknown>; status?: number },
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(init?.message ? { message: init.message } : {}),
      ...(init?.meta ? { meta: init.meta } : {}),
    },
    { status: init?.status ?? 200 },
  );
}

export function created<T>(data: T, message?: string): NextResponse {
  return ok(data, { status: 201, message });
}

export function fail(
  message: string,
  status = 400,
  code = "REQUEST_ERROR",
  details?: unknown,
): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      ...(details === undefined ? {} : { details }),
    },
    { status },
  );
}

export function unauthorized(
  message = "You need to sign in to continue.",
): NextResponse<ApiFailure> {
  return fail(message, 401, "UNAUTHORIZED");
}

export function handleApiError(error: unknown, context: string): NextResponse {
  const payload = toErrorPayload(error);
  if (payload.statusCode >= 500) {
    console.error(`[api:${context}]`, error);
  }
  if (error instanceof AuthError) {
    return fail(payload.message, payload.statusCode, payload.code);
  }
  return fail(payload.message, payload.statusCode, payload.code);
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ValidationError("Request body must be JSON.");
  }
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError("Request body contains invalid JSON.");
  }
}

export function methodNotAllowed(allowed: string[]): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `Method not allowed. Use ${allowed.join(", ")}.`,
      code: "METHOD_NOT_ALLOWED",
    },
    {
      status: 405,
      headers: { Allow: allowed.join(", ") },
    },
  );
}
