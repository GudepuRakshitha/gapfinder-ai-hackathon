import {
  AIError,
  RateLimitError,
  errorMessage,
} from "@/backend/utils/errors";

export const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

/**
 * Groq occasionally retires model aliases. The configured model is tried
 * first; if Groq reports a missing/decommissioned model we fall back to the
 * next supported Llama model and surface a warning in the service logs.
 */
export const GROQ_FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqRequestOptions {
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeoutMs?: number;
  retries?: number;
}

export interface GroqCompletion {
  text: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
}

interface GroqApiResponse {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string;
  }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; type?: string; code?: string };
}

export function getGroqApiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim();
  return key ? key : null;
}

export function isGroqConfigured(): boolean {
  return Boolean(getGroqApiKey());
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

export function getGroqStatus(): {
  configured: boolean;
  model: string | null;
} {
  return {
    configured: isGroqConfigured(),
    model: isGroqConfigured() ? getGroqModel() : null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroq(
  options: GroqRequestOptions,
  model: string,
): Promise<GroqCompletion> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new AIError(
      "Groq is not configured. Add GROQ_API_KEY to enable AI generation.",
      false,
      "GROQ_NOT_CONFIGURED",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 45_000,
  );

  try {
    const body: Record<string, unknown> = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1800,
      stream: false,
    };
    if (options.json) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      let apiMessage = "";
      try {
        const parsed = (await response.json()) as GroqApiResponse;
        apiMessage = parsed.error?.message ?? "";
      } catch {
        // ignore body parse errors
      }

      if (response.status === 429) {
        throw new RateLimitError(
          apiMessage ||
            "Groq rate limit reached. Wait a moment and try again.",
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new AIError(
          "Groq rejected the API key. Check GROQ_API_KEY and restart the server.",
          false,
          "GROQ_AUTH_ERROR",
        );
      }
      if (
        response.status === 404 ||
        /model.*(not found|decommissioned|does not exist)/i.test(apiMessage)
      ) {
        throw new AIError(
          apiMessage || `Groq model “${model}” is unavailable.`,
          false,
          "GROQ_MODEL_UNAVAILABLE",
        );
      }
      if (response.status === 413) {
        throw new AIError(
          "The retrieved context is too large for the AI request. Try a smaller quiz.",
          false,
          "GROQ_CONTEXT_TOO_LARGE",
        );
      }
      throw new AIError(
        apiMessage || `Groq request failed with status ${response.status}.`,
        response.status >= 500,
      );
    }

    const payload = (await response.json()) as GroqApiResponse;
    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new AIError("Groq returned an empty response.", true);
    }

    return {
      text,
      model: payload.model ?? model,
      usage: payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens ?? 0,
            completionTokens: payload.usage.completion_tokens ?? 0,
            totalTokens: payload.usage.total_tokens ?? 0,
          }
        : null,
    };
  } catch (error) {
    if (error instanceof AIError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIError(
        "The Groq request timed out. Try again with a smaller scope.",
        true,
        "GROQ_TIMEOUT",
      );
    }
    throw new AIError(
      `Could not reach Groq: ${errorMessage(error)}`,
      true,
      "GROQ_NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send a chat completion to Groq with bounded exponential backoff for rate
 * limits/server errors, and model fallback if an alias is retired.
 */
export async function groqCompletion(
  options: GroqRequestOptions,
): Promise<GroqCompletion> {
  const configured = getGroqModel();
  const models = [
    ...new Set([
      configured,
      ...GROQ_FALLBACK_MODELS.filter((model) => model !== configured),
    ]),
  ];
  const attempts = Math.max(0, options.retries ?? 2);
  let lastError: unknown = null;

  for (const model of models) {
    for (let attempt = 0; attempt <= attempts; attempt += 1) {
      try {
        return await callGroq(options, model);
      } catch (error) {
        lastError = error;
        const isModelUnavailable =
          error instanceof AIError &&
          error.code === "GROQ_MODEL_UNAVAILABLE";
        if (isModelUnavailable) {
          console.warn(
            `[groq] model ${model} unavailable; trying next fallback model.`,
          );
          break;
        }
        const retryable =
          error instanceof RateLimitError ||
          (error instanceof AIError && error.retryable);
        if (!retryable || attempt === attempts) break;
        await sleep(800 * 2 ** attempt);
      }
    }
  }

  if (lastError instanceof Error) {
    if (lastError instanceof AIError) throw lastError;
    throw new AIError(
      `Groq request failed: ${lastError.message}`,
      false,
      "GROQ_ERROR",
    );
  }
  throw new AIError("Groq request failed.", false);
}

export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");

    const objectCandidate =
      objectStart !== -1 && objectEnd > objectStart
        ? cleaned.slice(objectStart, objectEnd + 1)
        : null;
    const arrayCandidate =
      arrayStart !== -1 && arrayEnd > arrayStart
        ? cleaned.slice(arrayStart, arrayEnd + 1)
        : null;

    for (const candidate of [arrayCandidate, objectCandidate]) {
      if (!candidate) continue;
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // try next candidate
      }
    }
  }

  throw new AIError(
    "The AI returned a response that was not valid JSON.",
    true,
    "GROQ_INVALID_JSON",
  );
}

export async function groqJson<T>(options: GroqRequestOptions): Promise<T> {
  const completion = await groqCompletion({ ...options, json: true });
  return parseJsonResponse<T>(completion.text);
}

export async function groqText(
  options: GroqRequestOptions,
): Promise<GroqCompletion> {
  return groqCompletion(options);
}
