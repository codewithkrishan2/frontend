import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { ProfileForm } from "@/components/auth/profile-form";
import { appRoutes } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { UserResponse } from "@/lib/api/types";
import { loadCurrentUser } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import {
  Alert,
  Avatar,
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardTitle,
  Separator,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Authenticated landing page.
 *
 * Exercises the identity endpoints end to end — `GET /users/me` here,
 * `PATCH /users/me` through `ProfileForm`, and `POST /auth/logout` through the
 * shell's sign-out button.
 *
 * The access token is read straight from the session: middleware has already
 * refreshed it if it was stale, because a Server Component cannot write the
 * rotated token back to cookies.
 *
 * `loadCurrentUser` rather than `fetchCurrentUser`: the surrounding layout needs
 * the same profile for the sidebar, and the `cache` wrapper collapses the two
 * into one request.
 */
export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  let user: UserResponse;

  try {
    user = await loadCurrentUser(session.accessToken);
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
        <div className="flex flex-col gap-8">
          <PageHeader title="Your account" />
          <Alert tone="fail" title="Could not load your profile">
            {error.message}
          </Alert>
        </div>
      );
    }

    throw error;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Your account"
        description="Your profile, and the integrations that feed CodeRev your pull requests."
      />

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

        {/*
          No "Sign-in method" row: with both GitHub and Bitbucket in play it
          would be a guess. `UserResponse` carries no provider field, and the
          `UserLogin` row that knows the answer is not exposed, so showing
          anything here would be invention. Add it back when the backend
          returns the provider.
        */}
        <dl className="grid gap-5 sm:grid-cols-2">
          <Detail label="User ID" value={`#${user.id}`} mono />
          <Detail label="Member since" value={formatJoinDate(user.createdAt)} />
        </dl>
      </Card>

      {/* Route into the SCM module. Deliberately a pointer rather than a
          summary: rendering connection counts here would mean a second backend
          round trip on a page that does not otherwise need one. */}
      <Card
        padding="lg"
        className="card-halo isolate overflow-hidden bg-ink-900"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Connect your source control</CardTitle>
            <CardDescription className="mt-1.5">
              Link a GitHub or Bitbucket account so CodeRev can read pull
              requests and post reviews back.
            </CardDescription>
          </div>

          <Link
            href={appRoutes.integrations}
            className={cn(buttonVariants({ size: "md" }), "shrink-0")}
          >
            Manage integrations
          </Link>
        </div>
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
