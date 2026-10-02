import { NextResponse, type NextRequest } from "next/server";

import {
  appRoutes,
  oauthCallbackParams,
  oauthRoutes,
} from "@/lib/api/endpoints";
import { buildSessionCookies } from "@/lib/auth/cookies";

/**
 * Landing point for a successful sign-in, whichever provider was used.
 *
 * `OAuthRedirectFactory.success` redirects the browser here as
 * `/oauth-success?access_token=<jwt>&refresh_token=<uuid>` (snake_case, unlike
 * every JSON field the API returns). The hand-off is provider-agnostic — GitHub
 * and Bitbucket both arrive here with the same two parameters — so this handler
 * needs no knowledge of which one was used.
 *
 * Deliberately a Route Handler and not a page:
 *
 * - It can write httpOnly cookies, so the tokens are captured server-side and
 *   never become readable by page scripts. A client page would have to read
 *   `window.location`, which puts both tokens — including a 30-day refresh
 *   token — within reach of any injected script.
 * - It replies with a redirect, so the token-bearing URL is replaced in the
 *   address bar immediately.
 *
 * Caveat worth knowing: the tokens still travel in a URL, so they land in browser
 * history and in any access log along the way. That is the backend's chosen
 * hand-off and cannot be fixed from here — the fix would be for the callback to
 * set the cookie itself, or to hand over a short-lived one-time code.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const accessToken = params.get(oauthCallbackParams.accessToken);
  const refreshToken = params.get(oauthCallbackParams.refreshToken);

  if (!accessToken || !refreshToken) {
    const errorUrl = new URL(oauthRoutes.error, request.nextUrl.origin);
    errorUrl.searchParams.set(
      oauthCallbackParams.message,
      "Sign-in did not return a valid session. Please try again.",
    );
    return NextResponse.redirect(errorUrl);
  }

  const destination = new URL(appRoutes.dashboard, request.nextUrl.origin);
  const response = NextResponse.redirect(destination);

  // `expiresIn` is not part of the redirect, so the access token lifetime is
  // assumed to be the backend default (security.jwt.access-token-expiration,
  // 900s). Being wrong here is not dangerous: too short only means an extra
  // refresh, and the middleware refreshes on 401-worthy staleness anyway.
  const cookies = buildSessionCookies({
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: 900,
  });

  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
