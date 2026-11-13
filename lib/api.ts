import type { ApiResponse } from "@/backend/types";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: options.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("The request was cancelled.", 499, "ABORTED");
    }
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      503,
      "NETWORK_ERROR",
    );
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const message =
      payload && payload.success === false
        ? payload.error
        : `Request failed with status ${response.status}.`;
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gapfinder:unauthorized"));
    }
    throw new ApiError(
      message,
      response.status,
      payload && payload.success === false ? payload.code : undefined,
      payload && payload.success === false ? payload.details : undefined,
    );
  }

  return payload.data;
}

export const api = {
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return request<T>(path, { signal });
  },
  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return request<T>(path, { method: "POST", body, signal });
  },
  patch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return request<T>(path, { method: "PATCH", body, signal });
  },
  delete<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return request<T>(path, { method: "DELETE", body, signal });
  },
  upload<T>(
    path: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", path);
      xhr.responseType = "text";
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onerror = () => {
        reject(
          new ApiError(
            "The upload failed. Check your connection and try again.",
            503,
            "NETWORK_ERROR",
          ),
        );
      };

      xhr.onload = () => {
        let payload: ApiResponse<T> | null = null;
        try {
          payload = JSON.parse(xhr.responseText) as ApiResponse<T>;
        } catch {
          payload = null;
        }
        if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
          onProgress?.(100);
          resolve(payload.data);
          return;
        }
        reject(
          new ApiError(
            payload && payload.success === false
              ? payload.error
              : "The upload could not be processed.",
            xhr.status || 500,
            payload && payload.success === false ? payload.code : undefined,
          ),
        );
      };

      xhr.send(formData);
    });
  },
};

export function errorToMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
