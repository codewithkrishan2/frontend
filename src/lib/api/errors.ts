import type { ApiErrorPayload, ApiResponse } from "@/lib/api/types";

/**
 * A failed backend call.
 *
 * The identity controllers catch their own exceptions, so HTTP statuses do not
 * always match what `GlobalExceptionHandler` would produce. Notably
 * `POST /api/v1/auth/refresh` returns **401** for an `ApiException` rather than
 * the advice's 409, and every controller maps unexpected failures to 500 with a
 * generic message. Callers should branch on `status` plus `isUnauthorized`,
 * never on message text.
 */
export class ApiError extends Error {
  readonly status: number;
  /** Field name -> message, from bean validation failures (HTTP 400). */
  readonly fieldErrors: ApiErrorPayload;
  /** Present on ScmException responses. */
  readonly code: string | undefined;

  constructor(
    status: number,
    message: string,
    errors?: ApiErrorPayload | undefined,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;

    // `errors` doubles as a validation map and as `{ code }` for SCM failures.
    const { code, ...rest } = errors ?? {};
    this.code = code;
    this.fieldErrors = rest;
  }

  /**
   * True when the access token was missing, expired or belongs to a deleted
   * user. The backend cannot distinguish these: `JwtAuthenticationEntryPoint`
   * returns the same 401 and message with no `WWW-Authenticate` header, so the
   * only correct reaction is "refresh once, then re-authenticate".
   */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isValidationError(): boolean {
    return this.status === 400 && Object.keys(this.fieldErrors).length > 0;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** A 5xx, or a transport failure surfaced as 0. */
  get isServerError(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

/** Raised when the backend could not be reached at all. */
export class ApiTransportError extends ApiError {
  constructor(message: string) {
    super(0, message);
    this.name = "ApiTransportError";
  }
}

/**
 * Turns a non-OK response into an `ApiError`.
 *
 * Falls back to a status-derived message, because a 401 from the security entry
 * point and a 500 from a servlet container failure do not always carry the
 * envelope.
 */
export async function toApiError(response: Response): Promise<ApiError> {
  let envelope: ApiResponse<unknown> | undefined;

  try {
    envelope = (await response.json()) as ApiResponse<unknown>;
  } catch {
    // Non-JSON body (proxy error page, empty 502, ...). Nothing to salvage.
  }

  const message =
    envelope?.message?.trim() || defaultMessageForStatus(response.status);

  return new ApiError(response.status, message, envelope?.errors);
}

function defaultMessageForStatus(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have access to this resource.";
  if (status === 404) return "That resource could not be found.";
  if (status === 409) return "That request conflicts with the current state.";
  if (status >= 500) return "The server encountered an unexpected error.";
  return `Request failed with status ${status}.`;
}

/**
 * Collapses field errors into one readable line, for forms that show a single
 * message rather than per-field feedback.
 */
export function formatFieldErrors(error: ApiError): string | undefined {
  const entries = Object.entries(error.fieldErrors);
  if (entries.length === 0) return undefined;

  return entries.map(([field, message]) => `${field}: ${message}`).join(", ");
}
