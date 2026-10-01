import { NextResponse } from "next/server";

import { endpoints } from "@/lib/api/endpoints";
import { serverEnv } from "@/lib/env";

/**
 * Entry point for GitHub sign-in.
 *
 * Redirects the browser to the backend's `GET /api/v1/oauth/github/auth`, which
 * in turn 302s to GitHub's consent screen.
 *
 * Why this hop exists: `API_ORIGIN` is server-only, so a link in the page cannot
 * name the backend directly, and there is no longer a rewrite proxying
 * `/api/v1/**` (removed, because it would expose the whole API unauthenticated).
 * This handler is the one public, deliberate door to the backend.
 *
 * It must stay a redirect the browser follows itself — GitHub's consent screen is
 * an interactive page, so the navigation cannot happen inside fetch.
 */
export async function GET() {
  const { apiOrigin } = serverEnv();

  // The post-sign-in destination is not carried through. OAuth `state` would be
  // the place for it, but the backend generates its own `state` and never
  // validates or returns the one it receives, so there is nothing to round-trip
  // it in. Sign-in therefore always lands on the dashboard.
  const target = `${apiOrigin}${endpoints.oauth.githubAuthorize}`;

  return NextResponse.redirect(target, {
    // 307 rather than 302: preserves the method and makes it explicit that this
    // is a temporary hand-off, not a canonical location.
    status: 307,
    headers: {
      // This endpoint mutates auth state downstream; never let it be cached.
      "Cache-Control": "no-store",
    },
  });
}
