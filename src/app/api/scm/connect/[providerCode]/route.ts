import { NextResponse, type NextRequest } from "next/server";

import {
  appRoutes,
  SCM_CONNECT_START_FAILED,
  scmConnectStartParams,
} from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { getFreshAccessToken } from "@/lib/auth/session";
import { requestScmAuthorizationUrl } from "@/lib/scm/service";

/**
 * Starts a provider consent flow for one SCM provider.
 *
 * Three things have to happen in one hop, which is why this is a Route Handler
 * rather than a link or a Server Action:
 *
 * 1. The authorize call needs the access token, and that lives in an httpOnly
 *    cookie the browser's scripts cannot read.
 * 2. It may need refreshing first, and a Route Handler is one of the few places
 *    Next.js lets cookies be written — a Server Component could obtain a rotated
 *    refresh token but not persist it, logging the user out on their next
 *    request.
 * 3. The consent screen is an interactive page, so the final navigation must be
 *    a real browser redirect. Fetching it would return the consent page's HTML
 *    instead of showing it.
 *
 * The backend answers the authorize call with JSON rather than a 302 precisely
 * so the client owns this navigation.
 *
 * Reconnecting an existing account is the same flow: the backend upserts on
 * `(userId, providerId, externalAccountId)`, so consenting again renews the
 * credentials rather than creating a duplicate.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerCode: string }> },
) {
  const { providerCode } = await params;

  // Not validated against a local allow-list: providers are rows seeded from
  // `resources/scm/seed/*.json`, so the backend is the only authority on which
  // codes exist. An unknown one comes back as SCM_PROVIDER_NOT_FOUND below.
  // The value is URL-encoded by `endpoints.scm.authorize` before it is sent.

  const accessToken = await getFreshAccessToken();

  if (!accessToken) {
    // Either there was no session or the refresh token was rejected, in which
    // case `getFreshAccessToken` has already cleared the cookies.
    return redirectTo(request, appRoutes.login);
  }

  try {
    const { authorizationUrl } = await requestScmAuthorizationUrl(
      accessToken,
      providerCode,
    );

    // The URL is built by our own backend from seeded provider configuration, so
    // it is trusted — but it is still the one value here that becomes a
    // cross-origin navigation, so the scheme is checked rather than assumed.
    // Every provider consent endpoint is https; anything else means the seed
    // config is wrong and sending the user there would be an open redirect.
    if (!isHttps(authorizationUrl)) {
      return failed(
        request,
        providerCode,
        "SCM_PROVIDER_CONFIGURATION_INVALID",
      );
    }

    return NextResponse.redirect(authorizationUrl, {
      // 307 keeps the method and marks this as a hand-off rather than a
      // canonical location, matching `/api/auth/[provider]`.
      status: 307,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isUnauthorized) {
        // The token looked fresh and was not. Go through the sign-out handler so
        // the dead cookies are cleared; redirecting straight to /login would
        // leave them in place and middleware would bounce the user back.
        return redirectTo(request, appRoutes.signOut);
      }

      // `error.code` is a ScmErrorCode — enumerated and safe to surface.
      // Everything diagnostic stayed in the backend's logs.
      return failed(request, providerCode, error.code);
    }

    throw error;
  }
}

/**
 * Sends the user back to the hub with enough context to explain itself.
 *
 * A redirect rather than an error page: the user clicked "Connect" on
 * `/integrations` and that is where the retry lives.
 */
function failed(
  request: NextRequest,
  providerCode: string,
  reason: string | undefined,
) {
  const url = new URL(appRoutes.integrations, request.nextUrl.origin);
  url.searchParams.set(scmConnectStartParams.outcome, SCM_CONNECT_START_FAILED);
  url.searchParams.set(scmConnectStartParams.provider, providerCode);

  if (reason) {
    url.searchParams.set(scmConnectStartParams.reason, reason);
  }

  return NextResponse.redirect(url, {
    status: 303,
    headers: { "Cache-Control": "no-store" },
  });
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin), {
    status: 303,
    headers: { "Cache-Control": "no-store" },
  });
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
