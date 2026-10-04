import "server-only";

import { cache } from "react";

import type { UserResponse } from "@/lib/api/types";
import { fetchCurrentUser } from "@/lib/auth/session";

/**
 * `GET /api/v1/users/me`, deduplicated for the duration of one request.
 *
 * The authenticated layout needs the profile for the sidebar, and a page inside
 * it may need the same profile for its own content. Both run during the same
 * render, and `apiRequest` defaults to `cache: "no-store"` — correctly, since
 * every identity response is per-user — which means Next.js will not dedupe the
 * two calls on its own.
 *
 * React's `cache` memoises per request instead, so the layout and the page share
 * one call. Keyed on the token, which is what makes it safe: a different user's
 * request carries a different token and so gets its own entry.
 *
 * Rejections are memoised too, so both callers see the same `ApiError` and can
 * each decide what to do about it.
 */
export const loadCurrentUser = cache(
  async (accessToken: string): Promise<UserResponse> =>
    fetchCurrentUser(accessToken),
);
