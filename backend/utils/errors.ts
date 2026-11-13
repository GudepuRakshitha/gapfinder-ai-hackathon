export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class AuthError extends AppError {
  constructor(message = "You need to sign in to continue.") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource.") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class DocumentError extends AppError {
  constructor(message: string, statusCode = 422, code = "DOCUMENT_ERROR") {
    super(message, statusCode, code);
    this.name = "DocumentError";
  }
}

export class AIError extends AppError {
  readonly retryable: boolean;

  constructor(message: string, retryable = false, code = "AI_ERROR") {
    super(message, 502, code);
    this.name = "AIError";
    this.retryable = retryable;
  }
}

export class RateLimitError extends AIError {
  constructor(message = "The AI service is rate limited. Please try again shortly.") {
    super(message, true, "RATE_LIMITED");
    this.name = "RateLimitError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

export function toErrorPayload(error: unknown): {
  message: string;
  statusCode: number;
  code: string;
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    };
  }
  return {
    message: errorMessage(error),
    statusCode: 500,
    code: "INTERNAL_ERROR",
  };
}
