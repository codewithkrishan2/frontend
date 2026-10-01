import { NextResponse, type NextRequest } from "next/server";

import { appRoutes } from "@/lib/api/endpoints";
import { allCookieNames, cookieNames } from "@/lib/auth/cookies";
import { endpoints } from "@/lib/api/endpoints";
import { serverEnv } from "@/lib/env";

/**
 * Tears down the local session and returns the user to sign-in.
 *
 * This exists because a Server Component cannot clear cookies — Next.js only
 * permits cookie writes in Route Handlers, Server Actions and middleware. Without
 * it, a page that discovers its token is invalid could redirect to `/login`, but
 * the cookies would survive; middleware would then see "a session exists", bounce
 * the user to `/dashboard`, which would fail again — an infinite redirect loop.
 *
 * Reached by redirect from a page that got a 401 it cannot recover from. The
 * normal, user-initiated path is `logoutAction`, which also revokes the refresh
 * token before clearing.
 */
export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get(cookieNames.refreshToken)?.value;

  // Best-effort revoke so the refresh token does not stay usable for 30 days.
  // Logout is idempotent on the backend, and an unknown token still returns 200.
  if (refreshToken) {
    try {
      const { apiOrigin } = serverEnv();
      await fetch(`${apiOrigin}${endpoints.auth.logout}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
    } catch {
      // The local session must be cleared regardless of whether the backend
      // was reachable.
    }
  }

  const response = NextResponse.redirect(
    new URL(appRoutes.login, request.nextUrl.origin),
    { status: 303 },
  );

  for (const name of allCookieNames) {
    response.cookies.delete(name);
  }

  response.headers.set("Cache-Control", "no-store");

  return response;
}
