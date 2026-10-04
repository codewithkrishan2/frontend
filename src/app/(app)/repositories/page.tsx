import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { ProviderTile } from "@/components/scm/provider-tile";
import { Alert, Avatar, buttonVariants, Card, EmptyState } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import {
  isLiveConnection,
  needsReconnect,
  type ScmConnectionResponse,
} from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { connectionLabel } from "@/lib/repositories/presentation";
import { formatScmDate } from "@/lib/scm/presentation";
import { fetchScmConnections } from "@/lib/scm/service";

export const metadata: Metadata = {
  title: "Repositories",
};

/**
 * Choose which connected account to browse repositories through.
 *
 * **This is the "select SCM connection" step of the flow**, and it exists because
 * repository browsing has no provider-agnostic list: a repository is only
 * reachable through a connection, and the same name can exist on two providers.
 * Something has to resolve "show me repositories" into "through which
 * authorization?", and before this page existed the answer was "the integrations
 * hub, if you notice the Browse button on a card" — which made the sidebar's
 * Repositories row a link to a page it was already on, so clicking it did
 * nothing.
 *
 * It is deliberately a *thin* step rather than a screen in its own right:
 *
 * - **One live connection → redirect straight to its repositories.** The common
 *   case should not have to acknowledge a choice it does not have. A one-item
 *   picker is a dead click.
 * - **Several → a short list of accounts.** This is the only place the choice is
 *   genuinely the user's, so it is the only place it is asked.
 * - **None → the empty state points at connecting one.**
 *
 * Deliberately does **not** aggregate repositories across connections. That
 * would mean a provider call per connection on every page load, and paging a
 * merged list whose sources page independently and publish no totals is not a
 * solved problem — it would be invented complexity for a screen that exists to
 * get out of the way.
 */
export default async function RepositoriesHomePage() {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  let connections: ScmConnectionResponse[];

  try {
    connections = await fetchScmConnections(session.accessToken);
  } catch (error) {
    if (error instanceof ApiError) {
      // A Server Component cannot clear cookies, so an unrecoverable 401 has to
      // go through the sign-out handler or middleware bounces the user back.
      if (error.isUnauthorized) {
        redirect(appRoutes.signOut);
      }

      return (
        <div className="flex flex-col gap-8">
          <RepositoriesHomeHeader />
          <Alert tone="fail" title="Could not load your connections">
            {error.message}
          </Alert>
        </div>
      );
    }
    throw error;
  }

  const live = connections.filter(isLiveConnection);
  const usable = live.filter((connection) => !needsReconnect(connection));

  // The single-account case, which is most accounts. Outside any try, because
  // redirect() throws a sentinel the framework catches and our own catch would
  // otherwise swallow it.
  if (usable.length === 1) {
    const only = usable[0]!;
    redirect(
      appRoutes.repositories(only.providerCode, { connection: only.id }),
    );
  }

  if (usable.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <RepositoriesHomeHeader />

        <Card padding="none" tone="flat">
          <EmptyState
            title={
              live.length === 0
                ? "No source control connected yet"
                : "No connection is ready to use"
            }
            description={
              live.length === 0
                ? "Link a provider and CodeRev will read its repositories and pull requests. Credentials are held server-side and never reach your browser."
                : "Your connections need re-establishing before their repositories can be read — their stored credentials have expired or been revoked."
            }
            action={
              <Link
                href={appRoutes.integrations}
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                {live.length === 0 ? "Connect a provider" : "Manage connections"}
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <RepositoriesHomeHeader />

      <ul className="flex flex-col gap-3">
        {usable.map((connection) => {
          const label = connectionLabel(connection);

          return (
            <li key={connection.id}>
              <Card padding="md" interactive>
                <Link
                  href={appRoutes.repositories(connection.providerCode, {
                    connection: connection.id,
                  })}
                  className="flex items-center gap-4"
                >
                  <span className="relative shrink-0">
                    <Avatar
                      name={label}
                      src={connection.avatarUrl ?? undefined}
                      size="md"
                    />
                    <ProviderTile
                      providerCode={connection.providerCode}
                      size="sm"
                      className="absolute -right-1.5 -bottom-1.5 size-5 rounded-md ring-2 ring-ink-900"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium tracking-tight text-ink-50">
                      {label}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {connection.providerName}
                      <span aria-hidden> · </span>
                      {connection.externalAccountName}
                      {formatScmDate(connection.lastUsedAt) ? (
                        <>
                          <span aria-hidden> · </span>
                          last used {formatScmDate(connection.lastUsedAt)}
                        </>
                      ) : null}
                    </span>
                  </span>

                  <span
                    aria-hidden
                    className="shrink-0 text-subtle-foreground"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      <path d="M6 3.5 10.5 8 6 12.5" />
                    </svg>
                  </span>
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>

      {/* Connections that need reconnecting are named rather than silently
          omitted: a user with two accounts who sees only one listed should be
          told why, not left wondering whether we lost it. */}
      {live.length > usable.length ? (
        <Alert tone="warn" title="Some connections need reconnecting">
          {live.length - usable.length === 1
            ? "One of your connections has expired or had its access revoked, so its repositories cannot be read."
            : `${live.length - usable.length} of your connections have expired or had their access revoked, so their repositories cannot be read.`}
          <div className="mt-4">
            <Link
              href={appRoutes.integrations}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Manage connections
            </Link>
          </div>
        </Alert>
      ) : null}
    </div>
  );
}

function RepositoriesHomeHeader() {
  return (
    <PageHeader
      eyebrow="Source control"
      title="Repositories"
      description="Choose which connected account to browse. Repositories are read live from the provider using that account's credentials."
    />
  );
}
