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
