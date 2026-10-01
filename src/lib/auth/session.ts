import "server-only";

import { cookies } from "next/headers";

import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { apiRequest, apiRequestData } from "@/lib/api/server";
import type {
  AuthResponse,
  UpdateProfileRequest,
  UserResponse,
} from "@/lib/api/types";
import {
  allCookieNames,
  buildSessionCookies,
  cookieNames,
  isExpired,
} from "@/lib/auth/cookies";

/**
 * Reading and mutating the signed-in session.
 *
 * A note on where cookies can be written: Next.js only permits cookie mutation
 * in Server Actions and Route Handlers, never during a Server Component render.
 * That is why token refresh lives in the middleware and in Server Actions — a
 * Server Component that refreshed mid-render could obtain new tokens but would
 * have no way to persist them, silently discarding the rotated refresh token and
 * logging the user out on their next request.
 */

export type Session = {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms. `undefined` when the cookie is missing or unparsable. */
  accessTokenExpiresAt: number | undefined;
};

function parseExpiry(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Reads the session cookies. Returns null when not signed in. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();

  const accessToken = store.get(cookieNames.accessToken)?.value;
  const refreshToken = store.get(cookieNames.refreshToken)?.value;

  // The refresh token is what makes a session recoverable. Without it there is
  // nothing to continue, even if an access token happens to still be present.
  if (!refreshToken) return null;

  return {
    accessToken: accessToken ?? "",
    refreshToken,
    accessTokenExpiresAt: parseExpiry(
      store.get(cookieNames.accessTokenExpiry)?.value,
    ),
  };
}

/** True when the access token should be refreshed before the next API call. */
export function needsRefresh(session: Session): boolean {
  return !session.accessToken || isExpired(session.accessTokenExpiresAt);
}

/**
 * Exchanges a refresh token for a new pair.
 *
 * The backend **rotates and revokes**: `AuthService.refreshToken` marks the
 * presented token revoked before issuing the replacement, and there is a single
 * `app_refresh_token` column per login row. Two concurrent refreshes therefore
 * race and the loser gets 401 "Invalid refresh token". Callers must persist the
 * result immediately and must not refresh in parallel.
 */
export async function requestTokenRefresh(
  refreshToken: string,
): Promise<AuthResponse> {
  return apiRequestData<AuthResponse>(endpoints.auth.refresh, {
    method: "POST",
    body: { refreshToken },
  });
}

/**
 * Writes a token pair to cookies. Only valid inside a Server Action or Route
 * Handler.
 */
export async function persistSession(auth: AuthResponse): Promise<void> {
  const store = await cookies();

  for (const cookie of buildSessionCookies(auth)) {
    store.set(cookie.name, cookie.value, cookie.options);
  }
}

/** Clears the session cookies. Server Action or Route Handler only. */
export async function clearSession(): Promise<void> {
  const store = await cookies();

  for (const name of allCookieNames) {
    store.delete(name);
  }
}

/**
 * Returns a usable access token, refreshing first if necessary.
 *
 * Safe to call from a Server Action or Route Handler. Not safe from a Server
 * Component render, because it may need to write cookies.
 */
export async function getFreshAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  if (!needsRefresh(session)) return session.accessToken;

  try {
    const auth = await requestTokenRefresh(session.refreshToken);
    await persistSession(auth);
    return auth.accessToken;
  } catch (error) {
    // A rejected refresh token is terminal: it has been revoked, rotated by a
    // concurrent request, or it expired. Drop the session so the user is sent
    // back through sign-in rather than looping on failed refreshes.
    if (error instanceof ApiError && error.isUnauthorized) {
      await clearSession();
      return null;
    }

    throw error;
  }
}

/* ------------------------------------------------------------------------- *
 * Identity endpoint wrappers
 * ------------------------------------------------------------------------- */

/**
 * `GET /api/v1/users/me`
 *
 * Read-only, so it is callable from a Server Component. It does not refresh:
 * the middleware is responsible for ensuring the access token is fresh before
 * a protected page renders. A 401 here surfaces as `ApiError` for the caller to
 * turn into a redirect.
 */
export async function fetchCurrentUser(
  accessToken: string,
): Promise<UserResponse> {
  return apiRequestData<UserResponse>(endpoints.users.me, { accessToken });
}

/** `PATCH /api/v1/users/me` */
export async function updateCurrentUser(
  accessToken: string,
  request: UpdateProfileRequest,
): Promise<UserResponse> {
  return apiRequestData<UserResponse>(endpoints.users.updateMe, {
    method: "PATCH",
    body: request,
    accessToken,
  });
}

/**
 * `POST /api/v1/auth/logout`
 *
 * Revokes the refresh token server-side. Idempotent — an unknown token still
 * returns 200.
 *
 * Note the access token is **not** blacklisted by the backend, so it stays valid
 * until it expires (up to 15 minutes). Clearing the cookie is what actually ends
 * the session from this app's point of view.
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await apiRequest<void>(endpoints.auth.logout, {
    method: "POST",
    body: { refreshToken },
  });
}
