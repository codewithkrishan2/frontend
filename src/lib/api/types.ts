/**
 * TypeScript mirrors of the Spring Boot identity DTOs.
 *
 * Field names are verbatim from the Java classes. The backend has no Jackson
 * naming strategy configured, so JSON keys are exactly the Java field names
 * (camelCase) — do not rename anything here.
 *
 * Source of truth:
 *   common/response/ApiResponse.java
 *   identity/dto/response/AuthResponse.java
 *   identity/dto/response/UserResponse.java
 *   identity/dto/request/{RefreshTokenRequest,LogoutRequest,UpdateProfileRequest}.java
 *   identity/entity/UserStatus.java
 */

/** `ApiResponse.status` is a plain string, not an enum, on the Java side. */
export type ApiStatus = "SUCCESS" | "FAILED";

/**
 * The envelope wrapping every JSON response.
 *
 * `ApiResponse` is annotated `@JsonInclude(NON_NULL)`, so absent keys are the
 * norm rather than the exception:
 *
 * - success responses carry no `errors`
 * - error responses carry no `data`
 * - `ApiResponse.success(data)` emits no `message` (this is what `GET /users/me`
 *   uses, so do not rely on `message` being present on success)
 * - `ApiResponse.error(message)` emits no `errors`
 *
 * Only `status` is guaranteed.
 */
export type ApiResponse<T> = {
  status: ApiStatus;
  message?: string;
  data?: T;
  errors?: ApiErrorPayload;
};

/**
 * `errors` is typed `Object` in Java and its shape depends on the handler:
 *
 * - bean validation failures -> a flat map of field name to message
 * - ScmException -> `{ code: "<SCM_ERROR_CODE>" }`
 * - everything else -> absent
 *
 * A flat string map covers both live shapes.
 */
export type ApiErrorPayload = Record<string, string>;

/** `identity/entity/UserStatus.java` */
export type UserStatus = "ACTIVE" | "INACTIVE";

/**
 * `identity/dto/response/UserResponse.java`
 *
 * `status` is serialised as a String, not an enum: `UserMapper` calls
 * `user.getStatus().name()`.
 *
 * `fullName` and `profilePicture` are nullable columns. `UserResponse` itself
 * carries no `@JsonInclude`, so they arrive as explicit `null` rather than being
 * omitted — hence `| null` rather than optional.
 */
export type UserResponse = {
  id: number;
  email: string;
  fullName: string | null;
  profilePicture: string | null;
  status: UserStatus;
  emailVerified: boolean;
  /** ISO-8601 instant, e.g. "2024-05-01T12:34:56.789012Z". */
  createdAt: string;
};

/**
 * `identity/dto/response/AuthResponse.java`
 *
 * `expiresIn` is the access token lifetime in **seconds** (900 by default), not
 * an absolute timestamp.
 */
export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  /** Always "Bearer" — `AuthService` hardcodes it. */
  tokenType: string;
  expiresIn: number;
};

/** `identity/dto/request/RefreshTokenRequest.java` — @NotBlank */
export type RefreshTokenRequest = {
  refreshToken: string;
};

/** `identity/dto/request/LogoutRequest.java` — @NotBlank */
export type LogoutRequest = {
  refreshToken: string;
};

/**
 * `identity/dto/request/UpdateProfileRequest.java`
 *
 * `fullName` has only `@Size(max = 100)` — no `@NotBlank`. Omitting it or
 * sending `null` is a valid no-op, but sending `""` overwrites the stored name
 * with an empty string. See `MAX_FULL_NAME_LENGTH`.
 */
export type UpdateProfileRequest = {
  fullName?: string | null;
};

/** Mirrors `@Size(max = 100, message = "Name must not exceed 100 characters")`. */
export const MAX_FULL_NAME_LENGTH = 100;

/* ------------------------------------------------------------------------- *
 * SCM module
 *
 * Source of truth:
 *   scm/provider/dto/response/{ScmProviderResponse,ScmProviderDetailResponse}.java
 *   scm/connection/dto/response/{ScmConnectionResponse,ScmAuthorizationUrlResponse}.java
 *   scm/connection/dto/request/CreateScmConnectionRequest.java
 *   scm/connection/entity/ScmConnectionStatus.java
 *   scm/provider/entity/{ScmProviderType,ScmCapabilityCode,ScmOperationCode}.java
 *   scm/common/exception/ScmErrorCode.java
 *
 * None of these endpoints paginate: both collection endpoints return a bare
 * array in `data`, ordered server-side. There is no `page`/`size` to pass.
 * ------------------------------------------------------------------------- */

/**
 * `scm/provider/entity/ScmProviderType.java`
 *
 * Describes the *deployment shape* of a provider, not its brand — GitHub
 * Enterprise Server would be SELF_HOSTED while github.com is CLOUD. Both seeded
 * providers are currently CLOUD.
 *
 * Nullable because `ScmProviderMapper` guards the enum lookup
 * (`type != null ? type.name() : null`) rather than assuming the column is set.
 */
export type ScmProviderType = "CLOUD" | "SELF_HOSTED";

/**
 * `scm/connection/entity/ScmConnectionStatus.java`
 *
 * Each value implies a different recovery path, which is why the UI branches on
 * it rather than on a boolean:
 *
 * - `ACTIVE`       — usable.
 * - `EXPIRED`      — the access token aged out; a refresh or silent re-auth can fix it.
 * - `REVOKED`      — the user withdrew consent at the provider; needs fresh consent.
 * - `DISCONNECTED` — removed from this app. The row is kept for history and must
 *                    never be used for API calls.
 * - `ERROR`        — repeated provider failures; held aside deliberately.
 *
 * Note `GET /scm/connections` returns **every** row for the user, including
 * `DISCONNECTED` ones, because the repository query is
 * `findByUserIdOrderByConnectedAtDesc` with no status filter. Callers that want
 * only live connections have to filter — see `isLiveConnection`.
 */
export type ScmConnectionStatus =
  "ACTIVE" | "EXPIRED" | "REVOKED" | "DISCONNECTED" | "ERROR";

/**
 * `scm/provider/entity/ScmCapabilityCode.java`
 *
 * What a provider can do, as declared by its seed configuration. Returned
 * already sorted, split across `supportedCapabilities` and
 * `unsupportedCapabilities`.
 */
export type ScmCapabilityCode =
  | "LIST_REPOSITORIES"
  | "GET_REPOSITORY"
  | "LIST_PULL_REQUESTS"
  | "GET_PULL_REQUEST"
  | "GET_PULL_REQUEST_FILES"
  | "GET_PULL_REQUEST_DIFF"
  | "CREATE_WEBHOOK"
  | "DELETE_WEBHOOK"
  | "CREATE_PR_COMMENT"
  | "CREATE_PR_REVIEW"
  | "OAUTH_TOKEN_REFRESH"
  | "WEBHOOK_SIGNATURE_VERIFICATION";

/**
 * `scm/provider/entity/ScmOperationCode.java`
 *
 * The concrete HTTP calls wired up for a provider. A capability can be declared
 * supported while its operation row is missing, so the two lists are reported
 * separately rather than being collapsed into one.
 *
 * These are internal to the backend's outbound client — there is no REST
 * endpoint that invokes them yet.
 */
export type ScmOperationCode =
  | "GET_CURRENT_ACCOUNT"
  | "LIST_REPOSITORIES"
  | "GET_REPOSITORY"
  | "LIST_PULL_REQUESTS"
  | "GET_PULL_REQUEST"
  | "GET_PULL_REQUEST_FILES"
  | "GET_PULL_REQUEST_DIFF"
  | "CREATE_WEBHOOK"
  | "DELETE_WEBHOOK"
  | "CREATE_PR_COMMENT"
  | "CREATE_PR_REVIEW";

/**
 * `scm/common/exception/ScmErrorCode.java`
 *
 * Arrives as `errors.code` on a failed SCM call, which `ApiError` lifts onto
 * `error.code`. This is the stable contract — branch on it, never on `message`,
 * which carries human-facing wording that may be reworded.
 */
export type ScmErrorCode =
  | "SCM_PROVIDER_NOT_FOUND"
  | "SCM_PROVIDER_INACTIVE"
  | "SCM_PROVIDER_CONFIGURATION_INVALID"
  | "SCM_CONNECTION_NOT_FOUND"
  | "SCM_CONNECTION_ALREADY_EXISTS"
  | "SCM_CONNECTION_EXPIRED"
  | "SCM_CONNECTION_REVOKED"
  | "SCM_OPERATION_NOT_SUPPORTED"
  | "SCM_OPERATION_NOT_CONFIGURED"
  | "SCM_OPERATION_PARAMETER_MISSING"
  | "SCM_RESPONSE_MAPPING_INVALID"
  | "SCM_OAUTH_EXCHANGE_FAILED"
  | "SCM_OAUTH_STATE_INVALID"
  | "SCM_WEBHOOK_SIGNATURE_INVALID"
  | "SCM_WEBHOOK_ALREADY_PROCESSED"
  | "SCM_WEBHOOK_EVENT_NOT_MAPPED"
  | "SCM_PROVIDER_API_ERROR"
  | "SCM_PROVIDER_RATE_LIMITED"
  | "SCM_SECRET_NOT_FOUND"
  | "SCM_SECRET_STORAGE_FAILED";

/**
 * `scm/provider/dto/response/ScmProviderResponse.java`
 *
 * `GET /api/v1/scm/providers` lists only active providers, ordered by
 * `displayOrder` then `providerName`.
 *
 * `providerCode` is deliberately a plain string, not a union: providers are rows
 * seeded from `resources/scm/seed/*.json`, so a new one is a database insert
 * rather than a code change. The UI looks up presentation metadata by code and
 * falls back gracefully for codes it has never seen.
 */
export type ScmProviderResponse = {
  id: number;
  providerCode: string;
  providerName: string;
  providerType: ScmProviderType | null;
  active: boolean;
  displayOrder: number;
};

/**
 * `scm/provider/dto/response/ScmProviderDetailResponse.java`
 *
 * `GET /api/v1/scm/providers/{providerId}` — keyed by the numeric id, not the
 * code. Resolves regardless of the `active` flag, unlike the list.
 *
 * Deliberately excludes the raw provider configuration, credential property
 * names and webhook signature settings.
 */
export type ScmProviderDetailResponse = ScmProviderResponse & {
  apiBaseUrl: string | null;
  /**
   * Scopes that will be requested at consent time, verbatim from the seed
   * config. Provider-defined strings (`"admin:repo_hook"`,
   * `"pullrequest:write"`), so not a union.
   */
  oauthScopes: string[];
  supportedCapabilities: ScmCapabilityCode[];
  /** Capabilities the provider explicitly declares it cannot do. */
  unsupportedCapabilities: ScmCapabilityCode[];
  /** Operations with an active configuration row. */
  configuredOperations: ScmOperationCode[];
};

/**
 * `scm/connection/dto/response/ScmConnectionResponse.java`
 *
 * One linked provider account. Never carries a token or a token reference — the
 * mapper has no access to the credential store by design.
 *
 * `tokenExpiry`, `lastUsedAt`, `displayName` and `avatarUrl` are nullable: the
 * first for providers whose tokens do not expire, the second until the
 * connection is first used, and the last two because they come from optional
 * metadata captured at consent time.
 */
export type ScmConnectionResponse = {
  id: number;
  providerId: number;
  providerCode: string;
  providerName: string;
  /** The provider's own account identifier. Stable across renames. */
  externalAccountId: string;
  /** Login/handle at the provider, e.g. a GitHub username. */
  externalAccountName: string;
  connectionStatus: ScmConnectionStatus;
  /** ISO-8601 instant, or null when the token does not expire. */
  tokenExpiry: string | null;
  /** ISO-8601 instant. */
  connectedAt: string;
  /** ISO-8601 instant, or null when never used. */
  lastUsedAt: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * `scm/connection/dto/response/ScmAuthorizationUrlResponse.java`
 *
 * `GET /api/v1/scm/connections/authorize?providerCode=...`
 *
 * Returned as JSON rather than a 302 so the client owns the navigation: `fetch`
 * cannot usefully follow a cross-origin redirect to a consent screen.
 *
 * `state` is a signed JWT (issuer `scm-oauth-state`, 10-minute expiry) and is
 * already embedded in `authorizationUrl`. It is echoed separately for callers
 * that want to correlate the round trip; this app does not need to, because the
 * backend verifies it on the callback.
 */
export type ScmAuthorizationUrlResponse = {
  authorizationUrl: string;
  providerCode: string;
  state: string;
};

/**
 * `scm/connection/dto/request/CreateScmConnectionRequest.java`
 *
 * Both fields are `@NotBlank`. This is the *frontend-captured-code* path
 * (`POST /api/v1/scm/connections`), which performs no state verification
 * because identity comes from the verified bearer token instead.
 *
 * Unused by this app: the configured provider redirect URIs point at the
 * backend's own callback, so connections complete through
 * `GET /api/v1/scm/connections/callback/{providerCode}` and land back here as a
 * browser redirect. Kept for completeness of the contract.
 */
export type CreateScmConnectionRequest = {
  providerCode: string;
  code: string;
};

/**
 * Whether a connection can still be used for provider API calls.
 *
 * `DISCONNECTED` rows are retained for history and are returned by the list
 * endpoint alongside live ones, so this predicate is what separates the two.
 */
export function isLiveConnection(connection: ScmConnectionResponse): boolean {
  return connection.connectionStatus !== "DISCONNECTED";
}

/**
 * Whether a connection needs the user to go through consent again.
 *
 * `EXPIRED` is included even though the backend *can* refresh some providers:
 * nothing triggers a refresh from the UI today, so surfacing it as actionable is
 * honest rather than optimistic.
 */
export function needsReconnect(connection: ScmConnectionResponse): boolean {
  return (
    connection.connectionStatus === "EXPIRED" ||
    connection.connectionStatus === "REVOKED" ||
    connection.connectionStatus === "ERROR"
  );
}
