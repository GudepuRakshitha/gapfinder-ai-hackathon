import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppError } from "@/backend/utils/errors";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey,
);

export const hasSupabasePublicConfig = Boolean(
  supabaseUrl && supabaseAnonKey,
);

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client. Server-only: never import this module from a client
 * component. All API routes authenticate the student before using this client.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, or run in local demo mode.",
      503,
      "SUPABASE_NOT_CONFIGURED",
    );
  }
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return adminClient;
}

/**
 * Cookie-aware Supabase client for auth flows in Route Handlers.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  if (!hasSupabasePublicConfig) {
    throw new AppError(
      "Supabase authentication is not configured.",
      503,
      "SUPABASE_NOT_CONFIGURED",
    );
  }
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render. Route handlers used for
          // auth mutations can always write cookies, so this is a no-op there.
        }
      },
    },
  });
}

export function getSupabaseConfigStatus(): {
  configured: boolean;
  publicConfigured: boolean;
  urlHost: string | null;
} {
  let urlHost: string | null = null;
  try {
    urlHost = supabaseUrl ? new URL(supabaseUrl).host : null;
  } catch {
    urlHost = null;
  }
  return {
    configured: isSupabaseConfigured,
    publicConfigured: hasSupabasePublicConfig,
    urlHost,
  };
}

export function assertSupabaseAdmin(error: unknown): never {
  const message =
    error instanceof Error ? error.message : "Unknown Supabase error.";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  if (code === "42P01" || code === "PGRST205" || /relation .* does not exist/i.test(message)) {
    throw new AppError(
      "Supabase tables are missing. Run supabase/schema.sql in the Supabase SQL editor, then retry.",
      500,
      "DATABASE_NOT_INITIALIZED",
    );
  }
  throw new AppError(
    `Database request failed: ${message}`,
    500,
    "DATABASE_ERROR",
  );
}
