import "server-only";

import type { AuthResponse } from "@/lib/api/types";

/**
 * Session cookie contract.
 *
 * Why cookies rather than localStorage: the tokens arrive as query parameters on
 * `/oauth-success`, and the obvious move is to stash them in `localStorage`. That
 * would make both tokens readable by any script on the page, which turns a single
 * XSS into a full account takeover including a 30-day refresh token. Writing them
 * to httpOnly cookies from a Route Handler means page scripts can never read
 * them, and the browser attaches them automatically for server-side use.
 *
 * The backend itself sets no cookies at all (it only issues bearer tokens in JSON
 * bodies), so this whole layer is the frontend's own doing.
 */

export const cookieNames = {
  accessToken: "coderev_at",
  refreshToken: "coderev_rt",
  /** Epoch milliseconds at which the access token expires. */
  accessTokenExpiry: "coderev_exp",
} as const;

/**
 * Refresh token lifetime, matching `security.jwt.refresh-token-expiration`
 * (2592000s / 30 days). The cookie should not outlive the token it holds.
 */
const REFRESH_TOKEN_MAX_AGE_SECONDS = 2_592_000;

/**
 * Treat the access token as expired this many seconds early.
 *
 * Covers clock skew and the round trip, so a token cannot expire in flight
 * between the middleware check and the backend receiving it.
 */
export const ACCESS_TOKEN_SKEW_SECONDS = 60;

export type SessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  };
};

function baseOptions(maxAge: number) {
  return {
    httpOnly: true,
    // Secure would break plain-HTTP local development, so it tracks NODE_ENV
    // rather than being hardcoded.
    secure: process.env.NODE_ENV === "production",
    // `lax`, not `strict`: the session is established by a cross-site redirect
    // back from GitHub via the backend. Under `strict` the browser would
    // withhold these cookies on that navigation and the user would land on
    // the dashboard already logged out.
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Builds the cookie set for a freshly issued token pair.
 *
 * `expiresIn` is a duration in seconds, not a timestamp, so it is converted to
 * an absolute deadline here — that is the value the middleware compares against.
 */
export function buildSessionCookies(auth: AuthResponse): SessionCookie[] {
  const expiresAt = Date.now() + auth.expiresIn * 1000;

  return [
    {
      name: cookieNames.accessToken,
      value: auth.accessToken,
      // The access-token cookie is given the refresh lifetime deliberately.
      // If it expired on its own the middleware would lose the ability to tell
      // "expired, go refresh" apart from "no session at all".
      options: baseOptions(REFRESH_TOKEN_MAX_AGE_SECONDS),
    },
    {
      name: cookieNames.refreshToken,
      value: auth.refreshToken,
      options: baseOptions(REFRESH_TOKEN_MAX_AGE_SECONDS),
    },
    {
      name: cookieNames.accessTokenExpiry,
      value: String(expiresAt),
      options: baseOptions(REFRESH_TOKEN_MAX_AGE_SECONDS),
    },
  ];
}

/** Names to clear on sign-out. */
export const allCookieNames: readonly string[] = [
  cookieNames.accessToken,
  cookieNames.refreshToken,
  cookieNames.accessTokenExpiry,
];

/** True when the deadline has passed, or is close enough to count as passed. */
export function isExpired(expiresAt: number | undefined): boolean {
  if (expiresAt === undefined) return true;
  return Date.now() >= expiresAt - ACCESS_TOKEN_SKEW_SECONDS * 1000;
}
