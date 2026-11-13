import { getStorageMode } from "@/backend/database/databaseQueries";
import { isSupabaseConfigured } from "@/backend/database/supabase";
import { getGroqStatus } from "@/backend/services/groqService";
import { RAG_STATUS } from "@/backend/services/ragService";
import { getAuthMode } from "@/backend/services/authService";
import { getQuizStatus } from "@/backend/services/quizService";
import { getTopicMappingStatus } from "@/backend/services/topicService";
import { ok } from "@/backend/utils/apiResponse";
import { APP_NAME } from "@/lib/constants";
import { DEMO_CREDENTIALS } from "@/lib/constants";
import type { AppStatus } from "@/backend/types";

export async function GET() {
  const storage = getStorageMode();
  const groq = getGroqStatus();
  const warnings: string[] = [];

  if (!groq.configured) {
    warnings.push(
      "GROQ_API_KEY is not set. Quizzes use source-grounded extractive questions, the tutor returns retrieved excerpts, and gap/plan narratives are rule-based.",
    );
  }
  if (storage === "local") {
    warnings.push(
      "No Supabase credentials detected. Data is stored in a local JSON file and is intended for evaluation and demos, not durable production use.",
    );
  }
  if (process.env.VERCEL && storage === "local" && !process.env.AUTH_SECRET?.trim()) {
    warnings.push(
      "Local mode on Vercel needs AUTH_SECRET because the filesystem is ephemeral.",
    );
  }

  const status: AppStatus = {
    appName: APP_NAME,
    version: "1.0.0",
    storage,
    auth: getAuthMode(),
    supabaseConfigured: isSupabaseConfigured,
    groqConfigured: groq.configured,
    groqModel: groq.model,
    retrieval: {
      method: RAG_STATUS.method,
      chunkSize: RAG_STATUS.chunkSize,
      overlap: RAG_STATUS.overlap,
    },
    demoCredentials: {
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    },
    warnings,
  };

  // Expose the quiz/topic engine status in meta so the UI can label fallbacks.
  return ok(status, {
    meta: {
      quiz: getQuizStatus(),
      topicMapping: getTopicMappingStatus(),
      retrieval: RAG_STATUS.description,
    },
  });
}
