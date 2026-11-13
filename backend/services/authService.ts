import { promises as fs } from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import type { AuthMode, AuthSession, Student } from "@/backend/types";
import { db } from "@/backend/database/databaseQueries";
import {
  createSupabaseServerClient,
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/backend/database/supabase";
import {
  setLocalPassword,
  verifyLocalCredentials,
} from "@/backend/database/localStore";
import {
  AppError,
  AuthError,
  ValidationError,
  errorMessage,
} from "@/backend/utils/errors";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "@/backend/utils/validateInput";
import { DEMO_CREDENTIALS, DEMO_STUDENT_ID } from "@/lib/constants";
import { ensureDemoWorkspace } from "@/backend/services/seedService";

const SESSION_COOKIE = "gapfinder_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
let cachedDevSecret: string | null = null;

export interface LoginResult {
  student: Student;
  mode: AuthMode;
  warnings: string[];
}

export interface SignupResult {
  student: Student | null;
  mode: AuthMode;
  requiresConfirmation: boolean;
  message?: string;
}

export function getAuthMode(): AuthMode {
  return isSupabaseConfigured ? "supabase" : "local";
}

function base64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

async function getSessionSecret(): Promise<string> {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured) return configured;

  if (process.env.VERCEL) {
    throw new AppError(
      "Set AUTH_SECRET in your Vercel environment variables to use local demo authentication, or configure Supabase authentication.",
      503,
      "AUTH_SECRET_MISSING",
    );
  }

  if (cachedDevSecret) return cachedDevSecret;
  const directory = path.join(process.cwd(), ".data");
  const file = path.join(directory, "auth-secret");
  try {
    cachedDevSecret = (await fs.readFile(file, "utf-8")).trim();
    if (cachedDevSecret) return cachedDevSecret;
  } catch {
    // create below
  }
  const secret = randomBytes(32).toString("hex");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(file, secret, "utf-8");
  cachedDevSecret = secret;
  return secret;
}

export async function verifyLocalSessionToken(
  token: string,
): Promise<string | null> {
  try {
    const [payloadPart, signaturePart] = token.split(".");
    if (!payloadPart || !signaturePart) return null;
    const secret = await getSessionSecret();
    const expected = base64Url(
      createHmac("sha256", secret).update(payloadPart).digest(),
    );
    const actual = Buffer.from(signaturePart);
    const expectedBuffer = Buffer.from(expected);
    if (
      actual.length !== expectedBuffer.length ||
      !timingSafeEqual(actual, expectedBuffer)
    ) {
      return null;
    }
    const payload = JSON.parse(
      fromBase64Url(payloadPart).toString("utf-8"),
    ) as { studentId?: string; exp?: number };
    if (
      !payload.studentId ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }
    return payload.studentId;
  } catch {
    return null;
  }
}

async function setLocalSession(studentId: string): Promise<void> {
  const secret = await getSessionSecret();
  const payload = base64Url(
    JSON.stringify({ studentId, exp: Date.now() + SESSION_MAX_AGE * 1000 }),
  );
  const signature = base64Url(
    createHmac("sha256", secret).update(payload).digest(),
  );
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = headerStore.get("host") ?? "";
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    // Secure behind HTTPS (Vercel), but keep `next start` usable on localhost.
    secure: forwardedProto
      ? forwardedProto.split(",")[0].trim() === "https"
      : process.env.NODE_ENV === "production" && !isLocalHost,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

async function clearLocalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

async function ensureSupabaseProfile(
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  },
  isDemo = false,
): Promise<Student> {
  const existing = await db.getStudentById(user.id);
  if (existing) return existing;
  const email = (user.email ?? `${user.id}@gapfinder.local`).toLowerCase();
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : email.split("@")[0];
  try {
    return await db.createStudent({
      id: user.id,
      email,
      fullName,
      isDemo,
    });
  } catch (error) {
    const retry = await db.getStudentById(user.id);
    if (retry) return retry;
    throw error;
  }
}

/** Ensure the demo Supabase auth account exists and has known credentials. */
async function provisionSupabaseDemoUser(): Promise<void> {
  const admin = getSupabaseAdmin();
  const email = DEMO_CREDENTIALS.email;
  try {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw error;
    const user = data.users.find(
      (item) => item.email?.toLowerCase() === email,
    );
    if (user) {
      await admin.auth.admin.updateUserById(user.id, {
        password: DEMO_CREDENTIALS.password,
        email_confirm: true,
        user_metadata: { full_name: DEMO_CREDENTIALS.name },
      });
      return;
    }
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: DEMO_CREDENTIALS.password,
      email_confirm: true,
      user_metadata: { full_name: DEMO_CREDENTIALS.name },
    });
    if (createError) throw createError;
  } catch (error) {
    throw new AuthError(
      `The demo account could not be provisioned in Supabase: ${errorMessage(error)}. Check SUPABASE_SERVICE_ROLE_KEY.`,
    );
  }
}

async function maybeSeedDemo(student: Student): Promise<string[]> {
  if (!student.isDemo || student.demoSeeded) return [];
  const warnings: string[] = [];
  try {
    const result = await ensureDemoWorkspace(student.id);
    await db.updateStudent(student.id, { demoSeeded: true });
    if (result.alreadySeeded) {
      warnings.push("Demo materials were already present.");
    }
  } catch (error) {
    warnings.push(
      `The demo workspace could not be prepared automatically (${errorMessage(error)}). Use “Load sample pack” on the Materials page.`,
    );
  }
  return warnings;
}

export async function getSessionStudent(): Promise<Student | null> {
  if (isSupabaseConfigured) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return null;
      return ensureSupabaseProfile(
        {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
        },
        data.user.email?.toLowerCase() === DEMO_CREDENTIALS.email,
      );
    } catch (error) {
      console.error("[auth] Supabase session lookup failed:", error);
      return null;
    }
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const studentId = await verifyLocalSessionToken(token);
    if (!studentId) return null;
    return await db.getStudentById(studentId);
  } catch {
    return null;
  }
}

export async function loginStudent(
  emailInput: unknown,
  passwordInput: unknown,
): Promise<LoginResult> {
  const email = validateEmail(emailInput);
  const password = validatePassword(passwordInput);
  const isDemo = email === DEMO_CREDENTIALS.email;

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && isDemo) {
      await provisionSupabaseDemoUser();
      const retry = await supabase.auth.signInWithPassword({ email, password });
      data = retry.data;
      error = retry.error;
    }

    if (error || !data.user) {
      throw new AuthError(
        error?.message?.includes("confirm")
          ? "Your email is not confirmed yet. Check your inbox, or use the demo account."
          : "Invalid email or password.",
      );
    }

    const student = await ensureSupabaseProfile(
      {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
      },
      isDemo,
    );
    const warnings = await maybeSeedDemo(student);
    return { student, mode: "supabase", warnings };
  }

  const student = await verifyLocalCredentials(email, password);
  if (!student) {
    throw new AuthError("Invalid email or password.");
  }
  await setLocalSession(student.id);
  const warnings = await maybeSeedDemo(student);
  return { student, mode: "local", warnings };
}

export async function signupStudent(input: {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
}): Promise<SignupResult> {
  const email = validateEmail(input.email);
  const password = validatePassword(input.password);
  const fullName = validateName(input.fullName) || email.split("@")[0];

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      throw new ValidationError(
        /already registered|already exists/i.test(error.message)
          ? "An account with this email already exists. Sign in instead."
          : error.message,
      );
    }
    if (!data.user) {
      throw new AppError("Sign up did not return a user.", 500, "SIGNUP_FAILED");
    }
    if (!data.session) {
      return {
        student: null,
        mode: "supabase",
        requiresConfirmation: true,
        message:
          "Account created. Confirm your email address, then sign in. (You can disable email confirmation in Supabase Auth settings for a hackathon demo.)",
      };
    }
    const student = await ensureSupabaseProfile({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    });
    return {
      student,
      mode: "supabase",
      requiresConfirmation: false,
    };
  }

  const existing = await db.getStudentByEmail(email);
  if (existing) {
    throw new ValidationError(
      "An account with this email already exists. Sign in instead.",
    );
  }
  const student = await db.createStudent({
    email,
    fullName,
    isDemo: false,
  });
  await setLocalPassword(student.id, password);
  await setLocalSession(student.id);
  return {
    student,
    mode: "local",
    requiresConfirmation: false,
  };
}

export async function logoutStudent(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // The local cookie is still cleared below.
    }
  }
  await clearLocalSession();
}

export async function buildAuthSession(
  student: Student,
): Promise<AuthSession> {
  return {
    student,
    mode: getAuthMode(),
    groqConfigured: Boolean(process.env.GROQ_API_KEY?.trim()),
    groqModel: process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
    supabaseConfigured: isSupabaseConfigured,
    demoCredentials: {
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    },
  };
}

/** Exposed for debugging/demo tests without leaking the secret. */
export function getDemoIdentity(): { id: string; email: string } {
  return { id: DEMO_STUDENT_ID, email: DEMO_CREDENTIALS.email };
}
