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
 * `scm/connection/dto/ScmConnectionReadiness.java`
 *
 * The backend's derived answer to "can this connection be used right now".
 *
 * **Prefer this over {@link ScmConnectionStatus}.** The raw status cannot answer
 * that question on its own: `EXPIRED` is usable when the backend can refresh the
 * credential silently and not usable when it cannot. Reading the status directly
 * is what previously made this UI ask for consent the backend did not need.
 *
 * - `READY`                    — valid, or a provider whose tokens do not expire.
 * - `EXPIRING`                 — within 15 minutes of expiry; the backend's sweep
 *                                is already about to renew it. Advisory only.
 * - `REFRESHABLE`              — expired, but renewable with no user involvement.
 * - `REAUTHORIZATION_REQUIRED` — needs fresh consent.
 * - `DISCONNECTED`             — removed here on purpose; do not prompt.
 * - `ERROR`                    — held aside after repeated failures.
 *
 * Derived rather than stored, because it depends on the current time.
 */
export type ScmConnectionReadiness =
  | "READY"
  | "EXPIRING"
  | "REFRESHABLE"
  | "REAUTHORIZATION_REQUIRED"
  | "DISCONNECTED"
  | "ERROR";

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
 * These name the backend's *outbound* calls, not its own routes. The repository
 * endpoints invoke the six read operations — `LIST_REPOSITORIES` through
 * `GET_PULL_REQUEST_DIFF` — but a client never names an operation itself; it
 * calls a REST route and the backend chooses. The write operations
 * (`CREATE_WEBHOOK`, `CREATE_PR_COMMENT`, `CREATE_PR_REVIEW`) are still
 * unreachable from any route.
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
  /**
   * Derived readiness. Optional only because an older backend would omit it;
   * `isLiveConnection` and `needsReconnect` fall back to `connectionStatus`.
   */
  readiness?: ScmConnectionReadiness;
  /** Whether the backend will accept provider calls on this connection now. */
  usable?: boolean;
  /** Whether the user must go through consent again. */
  reauthorizationRequired?: boolean;
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
 * Whether a connection can be used for provider API calls right now.
 *
 * Reads the backend's derived `usable` flag in preference to the raw status,
 * because the two disagree on the one case that matters: an `EXPIRED` connection
 * the backend can refresh silently is usable, and treating it otherwise hides a
 * working account behind a reconnect prompt.
 */
export function isUsableConnection(connection: ScmConnectionResponse): boolean {
  if (typeof connection.usable === "boolean") {
    return connection.usable;
  }
  // Fallback mirrors the backend's own ScmConnection.isUsable().
  return (
    connection.connectionStatus === "ACTIVE" ||
    connection.connectionStatus === "EXPIRED"
  );
}

/**
 * Whether a connection needs the user to go through consent again.
 *
 * `EXPIRED` is **not** included: the backend renews such a credential on demand
 * and ahead of time, and reports it as `REFRESHABLE` — usable, no user action.
 * Offering a reconnect there would ask the user to fix something that is not
 * broken. Only `REAUTHORIZATION_REQUIRED` and `ERROR` are the user's problem.
 */
export function needsReconnect(connection: ScmConnectionResponse): boolean {
  if (typeof connection.reauthorizationRequired === "boolean") {
    return connection.reauthorizationRequired || connection.readiness === "ERROR";
  }
  // Without the derived signal, a bare EXPIRED is ambiguous. Treated as not
  // actionable, because the backend will try to refresh it before any call and
  // the worst case is one failed request rather than a needless consent trip.
  return (
    connection.connectionStatus === "REVOKED" ||
    connection.connectionStatus === "ERROR"
  );
}

/* ------------------------------------------------------------------------- *
 * Repository Management module
 *
 * Source of truth:
 *   common/response/PageResponse.java
 *   repository/dto/{RepositoryResponse,RepositoryOwner,RepositoryVisibility}.java
 *   repository/dto/{RepositoryRefResponse,ScmResourceProvider}.java
 *   repository/dto/{PullRequestResponse,PullRequestAuthor,PullRequestFileResponse}.java
 *   repository/dto/{PullRequestDiffResponse,DiffFile,DiffHunk,DiffLine,DiffLineType}.java
 *   repository/dto/PullRequestStateFilter.java
 *   scm/common/model/{PullRequestState,FileChangeType}.java
 *
 * Unlike the connection and provider endpoints, **these paginate**: the
 * collection endpoints answer a `PageResponse` inside `data`.
 *
 * Every DTO here is annotated `@JsonInclude(NON_NULL)`, so a field this file
 * types as `| null` is in practice *absent* from the JSON rather than explicitly
 * null. Typing them as nullable rather than optional is deliberate: it forces a
 * call site to handle the missing case instead of letting `undefined` flow into
 * a template and render "undefined".
 * ------------------------------------------------------------------------- */

/**
 * `common/response/PageResponse.java`
 *
 * **`totalElements` and `totalPages` are frequently absent, and that is the
 * contract rather than a gap.** These pages are filled from a provider that
 * usually does not publish a total — GitHub's repository listing and
 * Bitbucket's diffstat both say only "there is another page". The backend's
 * options were to omit the total or invent one, and an invented total is worse
 * because a client cannot tell it is wrong: it would render "1–20 of 20" over a
 * list with three more pages.
 *
 * So: **page controls must be driven by `hasNext`, never by `totalPages`.**
 * Treat a present total as a bonus used only to show a count.
 *
 * There is a second meaning to their absence on a *search* response. The
 * backend applies a search term over a bounded scan of provider pages; a scan
 * that reached the end of the data knows the exact total and reports it, while
 * one stopped by the bound reports none. A missing total on a search is
 * therefore the signal that more matches may exist beyond what was looked at.
 *
 * `page` is zero-based, matching the backend and the query parameter. The UI
 * routes use 1-based page numbers because they are user-facing; `lib/repositories`
 * translates between the two.
 */
export type PageResponse<T> = {
  content: T[];
  /** Zero-based. */
  page: number;
  /** The requested size. The page may hold fewer items; never more. */
  size: number;
  /** Absent unless the total is genuinely known. */
  totalElements?: number;
  /** Absent whenever `totalElements` is. */
  totalPages?: number;
  first: boolean;
  /** Always `!hasNext`, so it is accurate even with no total. */
  last: boolean;
  hasNext: boolean;
};

/**
 * `repository/dto/ScmResourceProvider.java`
 *
 * Carried on every repository and pull request rather than inferred from the
 * connection that was queried, because the same repository name can exist on two
 * providers and a client that aggregates results needs the discriminator
 * attached to the data.
 *
 * `code` is stable and may be used to key presentation; it must not be branched
 * on for behaviour.
 */
export type ScmResourceProvider = {
  code: string;
  name: string;
};

/**
 * `repository/dto/RepositoryVisibility.java`
 *
 * `UNKNOWN` exists because a provider may omit the flag on a reduced payload.
 * Rendering such a repository as public would be a misstatement about access
 * control — the one field here where guessing is unacceptable.
 */
export type RepositoryVisibility = "PUBLIC" | "PRIVATE" | "UNKNOWN";

/**
 * `repository/dto/RepositoryOwner.java`
 *
 * `name` is the **addressable** owner segment (a GitHub login, a Bitbucket
 * workspace slug), not a display name — it is what the backend substitutes when
 * it asks a provider for this repository, so a link built from it resolves.
 */
export type RepositoryOwner = {
  id?: string;
  name?: string;
  avatarUrl?: string;
};

/**
 * `repository/dto/RepositoryResponse.java`
 *
 * **`id` is not an address.** It is the provider's own repository identifier,
 * useful for correlation and stable across renames, but no backend route accepts
 * it. Build nested links from `fullName` — or equivalently `owner.name` plus
 * `name` — because that is what provider APIs address repositories by.
 *
 * Note specifically that `fullName` is built from the provider's URL slug while
 * `name` can be a display name, so splitting `fullName` is correct where using
 * `name` would 404.
 *
 * Carries no credential material: no token, no token reference, no connection
 * secret. `cloneUrl` is the public clone address and nothing here clones.
 */
export type RepositoryResponse = {
  /** Provider's repository id. Correlation only — see the note above. */
  id: string;
  name: string;
  /** Owner-qualified name; the addressable key. */
  fullName: string;
  description?: string;
  defaultBranch?: string;
  visibility: RepositoryVisibility;
  webUrl?: string;
  cloneUrl?: string;
  owner?: RepositoryOwner;
  provider: ScmResourceProvider;
  /** ISO-8601 instant, or absent when the provider reported none readably. */
  updatedAt?: string;
};

/**
 * `repository/dto/RepositoryRefResponse.java`
 *
 * Attached to a pull-request **detail** response so the page can name and link
 * back to its repository. Deliberately not a full `RepositoryResponse`: that
 * would cost a second provider call per pull request.
 */
export type RepositoryRefResponse = {
  name: string;
  fullName: string;
  owner: string;
  provider: ScmResourceProvider;
};

/**
 * `scm/common/model/PullRequestState.java`
 *
 * Canonical, with "merged" already resolved by the backend. Providers disagree
 * on whether merged is a state or a closed pull request with a merge timestamp;
 * the backend settles it, so a client never sees a merged pull request labelled
 * `CLOSED` and the state shown always matches the state filtered on.
 *
 * `UNKNOWN` is the lenient fallback for a provider value the backend could not
 * map — one lost field rather than a failed request.
 */
export type PullRequestState = "OPEN" | "CLOSED" | "MERGED" | "UNKNOWN";

/**
 * `repository/dto/PullRequestAuthor.java`
 *
 * Both fields are optional and the whole object may be absent: a pull request
 * opened by a since-deleted account genuinely has no author. Render "Unknown
 * author" rather than assuming it is there.
 */
export type PullRequestAuthor = {
  id?: string;
  username?: string;
};

/**
 * `repository/dto/PullRequestResponse.java`
 *
 * **`number`, not `id`, is the address.** On at least one provider they are
 * different integers and only `number` is accepted in a pull-request URL.
 *
 * `repository` is present on the detail response and absent from list rows,
 * where it would repeat identically on every item.
 */
export type PullRequestResponse = {
  /** Provider's global id. Correlation only. */
  id: string;
  /** The addressable, user-visible number. */
  number: number;
  title?: string;
  /** Author-written body. May be long; may be absent. */
  description?: string;
  state: PullRequestState;
  author?: PullRequestAuthor;
  sourceBranch?: string;
  targetBranch?: string;
  sourceCommitSha?: string;
  targetCommitSha?: string;
  /** ISO-8601 instant. */
  createdAt?: string;
  updatedAt?: string;
  /** Set only for a merged pull request, where the provider reports it. */
  mergedAt?: string;
  webUrl?: string;
  /** Detail responses only. */
  repository?: RepositoryRefResponse;
};

/**
 * `scm/common/model/FileChangeType.java`
 *
 * `UNKNOWN` is the fallback for an unmapped provider status.
 */
export type FileChangeType =
  | "ADDED"
  | "MODIFIED"
  | "REMOVED"
  | "RENAMED"
  | "UNKNOWN";

/**
 * `repository/dto/PullRequestFileResponse.java`
 *
 * Per-file patches are **not** included even where a provider volunteers them
 * inline, because only some do — serving them would make the response shape
 * depend on which provider answered. The diff endpoint is the single source of
 * patch content.
 *
 * `changes` is `additions + deletions`, computed server-side. It stays absent
 * when the provider reported neither count, rather than becoming a confident
 * zero for a file that certainly did change.
 */
export type PullRequestFileResponse = {
  /** Current path; for a deletion, the path before removal. */
  path: string;
  /** Set for a rename or move. */
  previousPath?: string;
  status: FileChangeType;
  additions?: number;
  deletions?: number;
  changes?: number;
};

/**
 * `repository/dto/DiffLineType.java`
 *
 * Three values, not four: the `\ No newline at end of file` marker annotates the
 * preceding line rather than being a line of either version of the file, so the
 * backend's parser drops it instead of giving it a type.
 */
export type DiffLineType = "ADDED" | "REMOVED" | "CONTEXT";

/**
 * `repository/dto/DiffLine.java`
 *
 * Both line numbers are resolved server-side and **either may be absent**: an
 * added line has no number in the old file and a removed line none in the new
 * one. Having both is what lets the same payload drive a unified view and a
 * side-by-side one without a client counting from the hunk header.
 *
 * `content` has its leading `+`, `-` or space marker already stripped — the
 * marker is redundant once `type` exists, and leaving it in would corrupt
 * indentation measurement.
 */
export type DiffLine = {
  type: DiffLineType;
  /** Line text, marker stripped. An empty line is `""`. */
  content: string;
  /** 1-based in the old file; absent for an addition. */
  oldLineNumber?: number;
  /** 1-based in the new file; absent for a deletion. */
  newLineNumber?: number;
};

/**
 * `repository/dto/DiffHunk.java`
 *
 * Hunks stay separate rather than being flattened per file, because the gap
 * between two of them is meaningful — it is skipped, unchanged code — which is
 * what lets a viewer draw the "…" divider.
 */
export type DiffHunk = {
  /** The raw `@@ … @@ section` line; the trailing section heading is useful context. */
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
};

/**
 * `repository/dto/DiffFile.java`
 *
 * **`binary` and `truncated` both mean "no hunks here", for different reasons,
 * and must be rendered differently.** A binary file has no textual diff and
 * never will; a truncated one has one that was too large to include. Showing
 * either as an empty file would report a size limit as "nothing changed".
 */
export type DiffFile = {
  path: string;
  previousPath?: string;
  status: FileChangeType;
  additions: number;
  deletions: number;
  binary: boolean;
  /** This file's hunks were dropped because the parse budget ran out. */
  truncated: boolean;
  hunks: DiffHunk[];
};

/**
 * `repository/dto/PullRequestDiffResponse.java`
 *
 * The provider returns unified-diff text; the backend parses it. That split is
 * deliberate — the parse is identical for every provider and every client, it
 * holds the fiddly line-numbering arithmetic, and doing it server-side means the
 * browser never receives a multi-megabyte string it must walk before showing the
 * first file.
 *
 * This is **not** a review format. No findings, severities or suggestions — only
 * what changed.
 */
export type PullRequestDiffResponse = {
  pullRequestNumber: number;
  files: DiffFile[];
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  /**
   * Some files were dropped or left without hunks.
   *
   * Worth surfacing: a diff viewer showing 40 of 900 changed files without
   * saying so would read as a small pull request.
   */
  truncated: boolean;
};

/**
 * Error codes the Repository Management endpoints add to `ScmErrorCode`.
 *
 * Each exists because it calls for a different response from the client, which
 * is why they are not one generic failure:
 *
 * - `SCM_CONNECTION_NOT_ACTIVE` — 409. The caller owns the connection but its
 *   credentials are gone. Offer reconnect; do **not** report it as missing.
 * - `SCM_REQUEST_INVALID` — 400. A page size out of range, or an unrecognised
 *   state filter.
 * - `SCM_REPOSITORY_NOT_FOUND` / `SCM_PULL_REQUEST_NOT_FOUND` — 404. Absent, or
 *   invisible to this credential; providers do not distinguish the two and
 *   neither does the backend.
 * - `SCM_PROVIDER_RESOURCE_NOT_FOUND` — 404. The engine's generic form, reached
 *   only where the request named no specific resource.
 */
export type RepositoryErrorCode =
  | "SCM_CONNECTION_NOT_ACTIVE"
  | "SCM_REQUEST_INVALID"
  | "SCM_PROVIDER_RESOURCE_NOT_FOUND"
  | "SCM_REPOSITORY_NOT_FOUND"
  | "SCM_REPOSITORY_SCOPE_NOT_FOUND"
  | "SCM_PULL_REQUEST_NOT_FOUND";

/**
 * Splits a repository's `fullName` into the two path segments the API addresses
 * it by.
 *
 * Splits on the **last** separator so the owner segment survives intact, matching
 * the backend's `RepositoryRef.parse`. Returns `null` for a value that is not
 * owner-qualified, so a caller renders a 404 rather than requesting a malformed
 * URL.
 *
 * Use this rather than `{ owner: repo.owner?.name, name: repo.name }`: where a
 * provider distinguishes a display name from a URL slug, `fullName` carries the
 * slug and `name` does not.
 */
export function splitRepositoryFullName(
  fullName: string,
): { owner: string; name: string } | null {
  const separator = fullName.lastIndexOf("/");
  if (separator <= 0 || separator === fullName.length - 1) return null;

  return {
    owner: fullName.slice(0, separator),
    name: fullName.slice(separator + 1),
  };
}
