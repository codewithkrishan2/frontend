import "server-only";

import { ApiTransportError, toApiError } from "@/lib/api/errors";
import type { ApiResponse } from "@/lib/api/types";
import { serverEnv } from "@/lib/env";

/**
 * Server-side HTTP access to the Spring Boot API.
 *
 * Only ever imported by Server Components, Server Actions, Route Handlers and
 * middleware helpers — `server-only` makes an accidental client import a build
 * error rather than a runtime token leak.
 */

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Serialised as JSON. */
  body?: unknown;
  /** Bearer token to attach. Omit for public endpoints. */
  accessToken?: string | undefined;
  /**
   * Next.js caching. Defaults to "no-store": every identity response is
   * per-user and must never be shared between requests.
   */
  cache?: RequestCache;
  signal?: AbortSignal;
};

/**
 * Performs the request and unwraps the `ApiResponse` envelope.
 *
 * Throws `ApiError` for any non-2xx, and `ApiTransportError` when the backend is
 * unreachable — callers should not have to distinguish "fetch rejected" from
 * "server said no".
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { apiOrigin } = serverEnv();
  const {
    method = "GET",
    body,
    accessToken,
    cache = "no-store",
    signal,
  } = options;

  const headers: Record<string, string> = { Accept: "application/json" };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;

  try {
    response = await fetch(`${apiOrigin}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache,
      ...(signal ? { signal } : {}),
    });
  } catch {
    // A connection refused here almost always means the Spring Boot app is not
    // running, so say that rather than surfacing a raw fetch message.
    throw new ApiTransportError(
      `Could not reach the API at ${apiOrigin}. Is the backend running?`,
    );
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  // 204 and empty bodies are not produced by these controllers today, but an
  // empty parse should not crash a caller if that changes.
  const text = await response.text();
  if (!text) return { status: "SUCCESS" };

  return JSON.parse(text) as ApiResponse<T>;
}

/**
 * Like `apiRequest`, but asserts `data` is present.
 *
 * Useful because several endpoints return an envelope with no `data`
 * (`POST /auth/logout`), so `data` is optional on the type and every caller
 * would otherwise need its own null check.
 */
export async function apiRequestData<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const envelope = await apiRequest<T>(path, options);

  if (envelope.data === undefined || envelope.data === null) {
    throw new Error(
      `Expected data in the response from ${path} but the envelope had none.`,
    );
  }

  return envelope.data;
}
