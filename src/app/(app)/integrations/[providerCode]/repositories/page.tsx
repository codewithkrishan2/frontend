import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { ConnectionSwitcher } from "@/components/repositories/connection-switcher";
import { PageNav } from "@/components/repositories/page-nav";
import { RepositoryCard } from "@/components/repositories/repository-card";
import { RepositoryError } from "@/components/repositories/repository-error";
import { RepositorySearch } from "@/components/repositories/repository-search";
import { Alert, buttonVariants, Card, EmptyState } from "@/components/ui";
import {
  appRoutes,
  repositoryBrowseParams,
  type RepositoryBrowseParams,
} from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type {
  PageResponse,
  RepositoryResponse,
  ScmConnectionResponse,
} from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import {
  connectionLabel,
  readConnectionParam,
  readPageParam,
  resolveBrowseConnection,
  singleParam,
} from "@/lib/repositories/presentation";
import { fetchRepositories } from "@/lib/repositories/service";
import { fetchScmConnections } from "@/lib/scm/service";

export const metadata: Metadata = {
  title: "Repositories",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Items per page. Matches the backend default and stays under its cap of 100. */
const PAGE_SIZE = 20;

/**
 * Repositories reachable through one of the user's connections.
 *
 * **Two reads, in sequence rather than in parallel, and that is deliberate.**
 * The connection list has to resolve first because its result decides which
 * connection the repository read uses — there is no repository call to make
 * until we know whose credential to make it with. This is the opposite of the
 * integrations hub, where the two reads are independent and run together.
 *
 * Routed by `providerCode` so the URL is `/integrations/GITHUB/repositories`,
 * but the backend resolves everything against a connection, so the connection
 * rides along as an optional `?connection=` parameter. It defaults to the newest
 * live connection for the provider and only matters once a user has linked two
 * accounts on the same provider.
 *
 * Every piece of state is in the URL — account, page, search — so each view is
 * shareable, the back button works, and nothing needs client JavaScript.
 */
export default async function RepositoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerCode: string }>;
  searchParams: SearchParams;
}) {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  const { providerCode } = await params;
  const query = await searchParams;

  const requestedConnection = readConnectionParam(
    query[repositoryBrowseParams.connection],
  );
  const page = readPageParam(query[repositoryBrowseParams.page]);
  const search = singleParam(query[repositoryBrowseParams.search])?.trim();

  // The connection list first: nothing else can be requested until we know
  // which authorization to request it through.
  let connections;
  try {
    connections = await fetchScmConnections(session.accessToken);
  } catch (error) {
    return handleLoadError(error, providerCode, "Could not load your connections");
  }

  const { connection, available, requestedUnavailable } =
    resolveBrowseConnection(connections, providerCode, requestedConnection);

  // notFound() throws a sentinel the framework catches, so it must not sit
  // inside a try — our own catch would see it first and the 404 status would be
  // lost on the way out. Same reasoning as the provider detail page.
  if (available.length === 0 && connections.length > 0) {
    const knownProvider = connections.some(
      (candidate) =>
        candidate.providerCode.toUpperCase() ===
        providerCode.trim().toUpperCase(),
    );
    if (!knownProvider) notFound();
  }

  const header = (
    <RepositoriesHeader providerCode={providerCode} accountLabel={
      connection ? connectionLabel(connection) : undefined
    } />
  );

  // An explicitly requested connection that cannot be used is reported rather
  // than quietly replaced with the default. Showing a different account's
  // repositories under a URL naming one account would be a convincing lie, and
  // two accounts on the same provider often have similarly named repositories.
  if (requestedUnavailable) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <Alert tone="fail" title="That account is not available">
          The connection in this link is not one of your active{" "}
          {providerCode} accounts. It may have been disconnected.
          <div className="mt-4 flex flex-wrap gap-2">
            {available.length > 0 ? (
              <Link
                href={appRoutes.repositories(providerCode)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Use your {connectionLabel(available[0]!)} account
              </Link>
            ) : null}
            <Link
              href={appRoutes.integrations}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Manage connections
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <Card padding="none" tone="flat">
          <EmptyState
            title={`No active ${providerCode} account`}
            description="Connect this provider and its repositories will appear here. An account that has been disconnected or had its access revoked needs reconnecting first."
            action={
              <Link
                href={appRoutes.integration(providerCode)}
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                Connect {providerCode}
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  let repositories: PageResponse<RepositoryResponse>;
  try {
    repositories = await fetchRepositories(session.accessToken, connection.id, {
      // The URL carries a 1-based page because it is user-facing; the backend
      // is zero-based. This single subtraction is the whole translation.
      page: page - 1,
      size: PAGE_SIZE,
      ...(search ? { search } : {}),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isUnauthorized) redirect(appRoutes.signOut);

      return (
        <div className="flex flex-col gap-8">
          {header}
          <Controls
            providerCode={providerCode}
            connectionId={connection.id}
            available={available}
            search={search}
          />
          <RepositoryError title="Could not load repositories" error={error} />
        </div>
      );
    }
    throw error;
  }

  const browse = (overrides: RepositoryBrowseParams): RepositoryBrowseParams => ({
    connection: connection.id,
    ...(search ? { search } : {}),
    ...overrides,
  });

  return (
    <div className="flex flex-col gap-8">
      {header}

      <Controls
        providerCode={providerCode}
        connectionId={connection.id}
        available={available}
        search={search}
      />

      {repositories.content.length === 0 ? (
        <Card padding="none" tone="flat">
          {search ? (
            <EmptyState
              title={`No repositories match "${search}"`}
              description={
                // The absence of a total is the backend's signal that its
                // bounded search did not reach the end of the data, so "no
                // matches" would be an overstatement. Say what was actually
                // established.
                repositories.totalElements === undefined
                  ? "Nothing matched in the most recently updated repositories this account can see. Search looks at a bounded number of them, so an older repository may not have been checked — try a more specific term, or browse without a filter."
                  : "Nothing in this account matches that term."
              }
              action={
                <Link
                  href={appRoutes.repositories(providerCode, {
                    connection: connection.id,
                  })}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Clear search
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="No repositories found"
              description={`CodeRev can see no repositories through this ${providerCode} account. Check that the account has access to them, and that the consent you granted covers repository access.`}
              action={
                <Link
                  href={appRoutes.integration(providerCode)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Review granted access
                </Link>
              }
            />
          )}
        </Card>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {repositories.content.map((repository) => (
              <li key={`${repository.provider.code}:${repository.id}`}>
                <RepositoryCard
                  repository={repository}
                  connectionId={connection.id}
                />
              </li>
            ))}
          </ul>

          <PageNav
            page={page}
            hasNext={repositories.hasNext}
            totalElements={repositories.totalElements}
            pageSize={PAGE_SIZE}
            itemCount={repositories.content.length}
            label="repositories"
            hrefForPage={(target) =>
              appRoutes.repositories(providerCode, browse({ page: target }))
            }
          />
        </>
      )}
    </div>
  );
}

function RepositoriesHeader({
  providerCode,
  accountLabel,
}: {
  providerCode: string;
  accountLabel: string | undefined;
}) {
  return (
    <PageHeader
      eyebrow="Source control"
      title="Repositories"
      description={
        accountLabel
          ? `Repositories CodeRev can read through your ${providerCode} account ${accountLabel}. Open one to see its pull requests.`
          : `Repositories CodeRev can read through your ${providerCode} connection.`
      }
      backTo={{
        href: appRoutes.integration(providerCode),
        label: `Back to ${providerCode}`,
      }}
    />
  );
}

/**
 * The account switcher and the search field.
 *
 * Extracted because they are rendered in both the success and the error state —
 * a failed read should not take away the controls that might fix it, most
 * obviously switching accounts or clearing a search that is producing an error.
 */
function Controls({
  providerCode,
  connectionId,
  available,
  search,
}: {
  providerCode: string;
  connectionId: number;
  available: readonly ScmConnectionResponse[];
  search: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <RepositorySearch
        action={appRoutes.repositories(providerCode)}
        value={search}
        label="Search repositories"
        placeholder="Search repositories…"
        preserve={{ [repositoryBrowseParams.connection]: connectionId }}
        clearHref={appRoutes.repositories(providerCode, {
          connection: connectionId,
        })}
      />

      <ConnectionSwitcher
        connections={available}
        activeId={connectionId}
        hrefFor={(id) =>
          appRoutes.repositories(providerCode, { connection: id })
        }
      />
    </div>
  );
}

/**
 * Turns a connection-list failure into a rendered state.
 *
 * Only ever called from a `catch`. `redirect()` works by throwing a sentinel, so
 * calling it here is safe — this function is already outside any `try`.
 */
function handleLoadError(
  error: unknown,
  providerCode: string,
  title: string,
): never | React.JSX.Element {
  if (error instanceof ApiError) {
    // A Server Component cannot clear cookies, so an unrecoverable 401 has to go
    // through the sign-out handler or middleware will bounce the user back here.
    if (error.isUnauthorized) redirect(appRoutes.signOut);

    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Source control"
          title="Repositories"
          backTo={{
            href: appRoutes.integration(providerCode),
            label: `Back to ${providerCode}`,
          }}
        />
        <RepositoryError title={title} error={error} />
      </div>
    );
  }
  throw error;
}
