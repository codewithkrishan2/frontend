import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell, type AppShellUser } from "@/components/app/app-shell";
import { appRoutes } from "@/lib/api/endpoints";
import { loadCurrentUser } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";

/**
 * Shell for the signed-in application.
 *
 * A route group, so it adds chrome without adding a URL segment — `/dashboard`
 * and `/integrations` keep their paths. Mirrors how `(marketing)` wraps the
 * public pages.
 *
 * The session check here is belt-and-braces: `middleware.ts` already guards
 * these prefixes and has refreshed the access token before this renders. It is
 * repeated because the middleware matcher is a literal regex that cannot be
 * derived from `routeGuards`, so the two could drift — and a layout that assumed
 * a session where there was none would crash rather than redirect.
 */

export const metadata: Metadata = {
  // Nothing behind sign-in should be indexed. Set on the group rather than on
  // each page so a new page cannot forget it.
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  let user: AppShellUser | null = null;

  try {
    const profile = await loadCurrentUser(session.accessToken);
    user = {
      email: profile.email,
      fullName: profile.fullName,
      profilePicture: profile.profilePicture,
    };
  } catch {
    // The chrome is not worth failing a page over. If the profile cannot be
    // loaded the sidebar simply omits the account block, and the page — which
    // shares this exact call through React's `cache` — reports the error itself
    // with the context to explain it. Redirecting on a 401 is left to the page
    // for the same reason: layouts and pages render concurrently, so the page
    // is the one place that can decide authoritatively.
    user = null;
  }

  return <AppShell user={user}>{children}</AppShell>;
}
