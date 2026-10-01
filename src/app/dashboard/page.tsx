import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileForm } from "@/components/auth/profile-form";
import { appRoutes } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { UserResponse } from "@/lib/api/types";
import { fetchCurrentUser, getSession } from "@/lib/auth/session";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  CardDescription,
  CardTitle,
  Container,
  Separator,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Authenticated landing page.
 *
 * Exists to exercise the identity endpoints end to end — `GET /users/me` here,
 * `PATCH /users/me` through `ProfileForm`, and `POST /auth/logout` through
 * `LogoutButton`. The real product surface comes later.
 *
 * The access token is read straight from the session: middleware has already
 * refreshed it if it was stale, because a Server Component cannot write the
 * rotated token back to cookies.
 */
export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  let user: UserResponse;

  try {
    user = await fetchCurrentUser(session.accessToken);
  } catch (error) {
    if (error instanceof ApiError) {
      // Middleware should have prevented this, but a token that looks fresh and
      // is not (forged, or the user was deleted) still lands here.
      //
      // Redirect to the sign-out handler rather than to /login: this is a Server
      // Component and cannot clear cookies, so going straight to /login would
      // leave the dead session in place and middleware would bounce us back
      // here forever.
      if (error.isUnauthorized) {
        redirect(appRoutes.signOut);
      }

      // Transport and 5xx failures are worth showing rather than crashing the
      // route, since the most likely cause is the backend being down.
      return (
        <DashboardShell>
          <Alert tone="fail" title="Could not load your profile">
            {error.message}
          </Alert>
        </DashboardShell>
      );
    }

    throw error;
  }

  return (
    <DashboardShell>
      <div className="flex flex-col gap-8">
        {/* Identity summary */}
        <Card padding="lg" className="edge-highlight">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar
              name={user.fullName ?? user.email}
              src={user.profilePicture ?? undefined}
              size="lg"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-medium tracking-tight text-ink-50">
                  {user.fullName ?? "Unnamed user"}
                </h2>

                <Badge
                  tone={user.status === "ACTIVE" ? "pass" : "warn"}
                  size="sm"
                >
                  {user.status === "ACTIVE" ? "Active" : "Inactive"}
                </Badge>

                {user.emailVerified ? (
                  <Badge tone="info" size="sm">
                    Email verified
                  </Badge>
                ) : (
                  <Badge tone="outline" size="sm">
                    Email unverified
                  </Badge>
                )}
              </div>

              <p className="mt-1 truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>

          <Separator soft className="my-6" />

          <dl className="grid gap-5 sm:grid-cols-3">
            <Detail label="User ID" value={`#${user.id}`} mono />
            <Detail
              label="Member since"
              value={formatJoinDate(user.createdAt)}
            />
            <Detail label="Sign-in method" value="GitHub" />
          </dl>
        </Card>

        {/* Editable profile */}
        <Card padding="lg">
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your name is the only editable field — the backend accepts nothing
            else on this endpoint yet.
          </CardDescription>

          <div className="mt-6 max-w-md">
            <ProfileForm currentFullName={user.fullName} />
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border glass-strong">
        <Container
          width="wide"
          className="flex h-16 items-center justify-between gap-4"
        >
          <Link href="/" aria-label="CodeRev home">
            <Logo markClassName="size-[1.875rem]" />
          </Link>

          <LogoutButton />
        </Container>
      </header>

      <main id="main" className="flex-1 py-10 sm:py-14">
        <Container width="wide">
          <h1 className="text-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in via GitHub. Repository analysis arrives in a later phase.
          </p>

          <div className="mt-10">{children}</div>
        </Container>
      </main>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "mt-1.5 font-mono text-sm text-ink-200"
            : "mt-1.5 text-sm text-ink-200"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * `createdAt` is an ISO instant whose fractional-second precision is not fixed,
 * so it is parsed rather than pattern-matched. Rendering is pinned to UTC and a
 * fixed locale to keep server and client output identical — a locale-dependent
 * format would differ between the two and trip hydration.
 */
function formatJoinDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
