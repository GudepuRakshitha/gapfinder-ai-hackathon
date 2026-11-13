import type {
  MaterialSourceType,
  QuizDifficulty,
} from "@/backend/types";
import {
  ACCEPTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  PLAN_MAX_DAYS,
  PLAN_MAX_HOURS,
  PLAN_MIN_DAYS,
  PLAN_MIN_HOURS,
  QUIZ_MAX_QUESTIONS,
  QUIZ_MIN_QUESTIONS,
  SOURCE_TYPE_OPTIONS,
} from "@/lib/constants";
import { ValidationError } from "@/backend/utils/errors";
import { isUuid } from "@/backend/utils/id";

export const ALLOWED_EXTENSIONS = new Set<string>(ACCEPTED_FILE_EXTENSIONS);
const ALLOWED_SOURCE_TYPES = new Set<MaterialSourceType>(
  SOURCE_TYPE_OPTIONS.map((option) => option.value),
);

export function sanitizeFileName(name: string): string {
  return name
    .replace(/^.*[\\/]/, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function getExtension(name: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

export function validateUploadFile(file: File): {
  extension: "pdf" | "docx" | "txt";
  fileName: string;
  size: number;
} {
  const fileName = sanitizeFileName(file.name);
  if (!fileName) throw new ValidationError("The file has an invalid name.");
  if (!file.size) throw new ValidationError("This file is empty.");
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(
      `“${fileName}” is larger than the ${MAX_FILE_SIZE_LABEL} limit.`,
    );
  }

  const extension = getExtension(fileName);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new ValidationError(
      `“${fileName}” is not supported. Upload a PDF, DOCX or TXT file.`,
    );
  }
  return {
    extension: extension as "pdf" | "docx" | "txt",
    fileName,
    size: file.size,
  };
}

export function validateSourceType(value: unknown): MaterialSourceType {
  if (typeof value === "string" && ALLOWED_SOURCE_TYPES.has(value as MaterialSourceType)) {
    return value as MaterialSourceType;
  }
  return "notes";
}

export function validateEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("Enter your email address.");
  }
  const email = value.trim().toLowerCase();
  if (
    email.length < 5 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  ) {
    throw new ValidationError("Enter a valid email address.");
  }
  return email;
}

export function validatePassword(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("Enter your password.");
  }
  if (value.length < 8) {
    throw new ValidationError("Password must be at least 8 characters.");
  }
  if (value.length > 72) {
    throw new ValidationError("Password must be 72 characters or fewer.");
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new ValidationError("Password must include a letter and a number.");
  }
  return value;
}

export function validateName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function validateRequiredString(
  value: unknown,
  field: string,
  min = 1,
  max = 500,
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new ValidationError(`${field} must be at least ${min} characters.`);
  }
  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be under ${max} characters.`);
  }
  return trimmed;
}

export function validateId(value: unknown, field = "ID"): string {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new ValidationError(`${field} is invalid.`);
  }
  return value;
}

export function validateDifficulty(value: unknown): QuizDifficulty {
  if (value === "easy" || value === "medium" || value === "hard" || value === "mixed") {
    return value;
  }
  return "mixed";
}

export function validateQuestionCount(value: unknown, fallback = 5): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(
    QUIZ_MAX_QUESTIONS,
    Math.max(QUIZ_MIN_QUESTIONS, Math.round(parsed)),
  );
}

export function validateRevisionPlanInput(input: {
  daysAvailable?: unknown;
  hoursPerDay?: unknown;
  examDate?: unknown;
}): { daysAvailable: number; hoursPerDay: number; examDate: string | null } {
  const days = Number(input.daysAvailable);
  const hours = Number(input.hoursPerDay);

  if (!Number.isFinite(days) || !Number.isInteger(days)) {
    throw new ValidationError("Preparation days must be a whole number.");
  }
  if (days < PLAN_MIN_DAYS || days > PLAN_MAX_DAYS) {
    throw new ValidationError(
      `Preparation days must be between ${PLAN_MIN_DAYS} and ${PLAN_MAX_DAYS}.`,
    );
  }
  if (!Number.isFinite(hours)) {
    throw new ValidationError("Hours per day must be a number.");
  }
  if (hours < PLAN_MIN_HOURS || hours > PLAN_MAX_HOURS) {
    throw new ValidationError(
      `Hours per day must be between ${PLAN_MIN_HOURS} and ${PLAN_MAX_HOURS}.`,
    );
  }

  let examDate: string | null = null;
  if (typeof input.examDate === "string" && input.examDate.trim()) {
    const raw = input.examDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new ValidationError("Exam date must use the YYYY-MM-DD format.");
    }
    const parsed = new Date(`${raw}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError("Exam date is invalid.");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed.getTime() < today.getTime()) {
      throw new ValidationError("Exam date cannot be in the past.");
    }
    examDate = raw;
  }

  return {
    daysAvailable: Math.round(days),
    hoursPerDay: Math.round(hours * 2) / 2,
    examDate,
  };
}

export function validateTutorMessage(value: unknown): string {
  return validateRequiredString(value, "Question", 2, 1200);
}

export function validateSelectedOption(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3) {
    throw new ValidationError("Each answer must be a valid option.");
  }
  return parsed;
}

export function coerceStringArray(value: unknown, max = 10): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}
