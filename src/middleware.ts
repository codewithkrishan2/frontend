import { NextResponse, type NextRequest } from "next/server";

import { appRoutes, endpoints, routeGuards } from "@/lib/api/endpoints";
import type { ApiResponse, AuthResponse } from "@/lib/api/types";
import {
  allCookieNames,
  buildSessionCookies,
  cookieNames,
  isExpired,
} from "@/lib/auth/cookies";

/**
 * Route protection and proactive token refresh.
 *
 * Refresh happens here rather than in a Server Component because Next.js only
 * allows cookie writes in middleware, Route Handlers and Server Actions. A
 * Server Component that refreshed during render could get new tokens but not
 * persist them — and since the backend rotates and revokes on every refresh,
 * losing the new refresh token would log the user out on their next request.
 *
 * So: middleware guarantees the access token is fresh before a protected page
 * renders, and the page itself just reads it.
 *
 * This module cannot import `@/lib/api/server` or `@/lib/auth/session`; those are
 * marked `server-only` and rely on `next/headers`, neither of which is available
 * in the middleware runtime. Hence the direct fetch below.
 */

function isProtected(pathname: string): boolean {
  return routeGuards.protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isGuestOnly(pathname: string): boolean {
  return routeGuards.guestOnlyPaths.some((path) => pathname === path);
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = appRoutes.login;
  url.search = "";

  // Preserve where the user was heading so sign-in can return them there.
  const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (target && target !== appRoutes.home) {
    url.searchParams.set(routeGuards.returnToParam, target);
  }

  const response = NextResponse.redirect(url);

  // Clear a dead session so the next request is not sent through this dance
  // again with the same unusable tokens.
  for (const name of allCookieNames) {
    response.cookies.delete(name);
  }

  return response;
}

/** Refreshes the token pair, returning null when the refresh token is rejected. */
async function refreshTokens(
  refreshToken: string,
): Promise<AuthResponse | null> {
  const apiOrigin = process.env.API_ORIGIN;
  if (!apiOrigin) return null;

  try {
    const response = await fetch(`${apiOrigin}${endpoints.auth.refresh}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const envelope = (await response.json()) as ApiResponse<AuthResponse>;
    return envelope.data ?? null;
  } catch {
    // Backend unreachable. Treat as "cannot establish a session right now"
    // rather than throwing a 500 at the user mid-navigation.
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const refreshToken = request.cookies.get(cookieNames.refreshToken)?.value;
  const accessToken = request.cookies.get(cookieNames.accessToken)?.value;
  const expiryRaw = request.cookies.get(cookieNames.accessTokenExpiry)?.value;

  const hasSession = Boolean(refreshToken);

  if (isGuestOnly(pathname) && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = appRoutes.dashboard;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  if (!refreshToken) {
    return redirectToLogin(request);
  }

  const expiresAt = expiryRaw ? Number(expiryRaw) : undefined;
  const stale =
    !accessToken ||
    isExpired(Number.isFinite(expiresAt) ? expiresAt : undefined);

  if (!stale) {
    return NextResponse.next();
  }

  const auth = await refreshTokens(refreshToken);

  if (!auth) {
    return redirectToLogin(request);
  }

  // Hand the refreshed token to the render pass *and* persist it. Setting it on
  // the request cookies means the Server Component reading cookies in this same
  // request sees the new token rather than the stale one.
  const response = NextResponse.next({ request });

  for (const cookie of buildSessionCookies(auth)) {
    request.cookies.set(cookie.name, cookie.value);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

export const config = {
  /**
   * Skip static assets and the OAuth landing routes.
   *
   * `/oauth-success` must not be matched: it is the Route Handler that creates
   * the session, and running the guard before it exists would redirect the user
   * to sign-in in the middle of signing in.
   *
   * This is the one place paths are spelled out rather than taken from
   * `lib/api/endpoints`. Next.js parses `config.matcher` statically at build
   * time, so it has to be a literal — an interpolated constant fails the build.
   * Keep the two `oauth-*` segments in step with `oauthRoutes`.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|oauth-success|oauth-error|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2)$).*)",
  ],
};
