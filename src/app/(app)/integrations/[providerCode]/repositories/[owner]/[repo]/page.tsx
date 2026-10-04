import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { PageNav } from "@/components/repositories/page-nav";
import { PullRequestRow } from "@/components/repositories/pull-request-row";
import { PullRequestStateTabs } from "@/components/repositories/pull-request-state-tabs";
import { RepositoryError } from "@/components/repositories/repository-error";
import { RepositorySearch } from "@/components/repositories/repository-search";
import {
  Alert,
  Badge,
  buttonVariants,
  Card,
  EmptyState,
  Separator,
} from "@/components/ui";
import {
  appRoutes,
  isPullRequestStateFilter,
  repositoryBrowseParams,
  type PullRequestStateFilter,
  type RepositoryBrowseParams,
} from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type {
  PageResponse,
  PullRequestResponse,
  RepositoryResponse,
} from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import {
  formatDateTime,
  pullRequestStateFilterLabel,
  readConnectionParam,
  readPageParam,
  repositoryVisibility,
  resolveBrowseConnection,
  singleParam,
} from "@/lib/repositories/presentation";
import {
  fetchPullRequests,
  fetchRepository,
} from "@/lib/repositories/service";
import { fetchScmConnections } from "@/lib/scm/service";

export const metadata: Metadata = {
  title: "Repository",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 20;

/**
 * One repository: its details, then its pull requests.
 *
 * **The repository and its pull requests are read in parallel.** Neither depends
 * on the other — both are addressed by the same `owner`/`repo` from the URL — so
 * issuing them together halves the page's latency. `Promise.allSettled` rather
 * than `Promise.all`, because the two failures mean different things and
 * collapsing them would be a worse page: a repository that loads while its pull
 * requests fail should still show the repository, with the failure confined to
 * the section it belongs to.
 *
 * `owner` and `repo` come from the URL as two segments, matching the backend.
 * They are not validated against a local list — the provider is the only
 * authority on which repositories exist, and an unknown one comes back as
 * `SCM_REPOSITORY_NOT_FOUND`.
 */
export default async function RepositoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerCode: string; owner: string; repo: string }>;
  searchParams: SearchParams;
}) {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  const { providerCode, owner, repo } = await params;
  const query = await searchParams;

  const requestedConnection = readConnectionParam(
    query[repositoryBrowseParams.connection],
  );
  const page = readPageParam(query[repositoryBrowseParams.page]);
  const search = singleParam(query[repositoryBrowseParams.search])?.trim();

  const stateParam = singleParam(query[repositoryBrowseParams.state]);
  // An unrecognised filter falls back to the backend's own default rather than
  // erroring. A hand-edited URL should show something sensible, and the tabs
  // make the actual filter obvious.
  const state: PullRequestStateFilter = isPullRequestStateFilter(stateParam)
    ? stateParam
    : "OPEN";

  const backToList = appRoutes.repositories(
    providerCode,
    requestedConnection !== undefined
      ? { connection: requestedConnection }
      : undefined,
  );

  let connections;
  try {
    connections = await fetchScmConnections(session.accessToken);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isUnauthorized) redirect(appRoutes.signOut);

      return (
        <div className="flex flex-col gap-8">
          <RepositoryHeader
            fullName={`${owner}/${repo}`}
            name={repo}
            backHref={backToList}
          />
          <RepositoryError
            title="Could not load your connections"
            error={error}
          />
        </div>
      );
    }
    throw error;
  }

  const { connection, requestedUnavailable } = resolveBrowseConnection(
    connections,
    providerCode,
    requestedConnection,
  );

  if (!connection) {
    return (
      <div className="flex flex-col gap-8">
        <RepositoryHeader
          fullName={`${owner}/${repo}`}
          name={repo}
          backHref={backToList}
        />
        <Alert
          tone="fail"
          title={
            requestedUnavailable
              ? "That account is not available"
              : `No active ${providerCode} account`
          }
        >
          {requestedUnavailable
            ? "The connection in this link is not one of your active accounts for this provider. It may have been disconnected."
            : "Connect this provider to browse its repositories."}
          <div className="mt-4">
            <Link
              href={appRoutes.integrations}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Manage connections
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  // Independent reads, issued together. allSettled so one failing section does
  // not blank the other.
  const [repositoryResult, pullRequestsResult] = await Promise.allSettled([
    fetchRepository(session.accessToken, connection.id, owner, repo),
    fetchPullRequests(session.accessToken, connection.id, owner, repo, {
      page: page - 1,
      size: PAGE_SIZE,
      state,
      ...(search ? { search } : {}),
    }),
  ]);

  // A 401 on either read means the session is unusable, and a Server Component
  // cannot clear cookies — so it has to go through the sign-out handler.
  for (const result of [repositoryResult, pullRequestsResult]) {
    if (
      result.status === "rejected" &&
      result.reason instanceof ApiError &&
      result.reason.isUnauthorized
    ) {
      redirect(appRoutes.signOut);
    }
  }

  const repository: RepositoryResponse | undefined =
    repositoryResult.status === "fulfilled" ? repositoryResult.value : undefined;

  const repositoryError = asApiError(repositoryResult);
  const pullRequestsError = asApiError(pullRequestsResult);

  const pullRequests: PageResponse<PullRequestResponse> | undefined =
    pullRequestsResult.status === "fulfilled"
      ? pullRequestsResult.value
      : undefined;

  const browse = (
    overrides: RepositoryBrowseParams,
  ): RepositoryBrowseParams => ({
    connection: connection.id,
    state,
    ...(search ? { search } : {}),
    ...overrides,
  });

  const visibility = repository
    ? repositoryVisibility(repository.visibility)
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      <RepositoryHeader
        fullName={repository?.fullName ?? `${owner}/${repo}`}
        name={repository?.name ?? repo}
        description={repository?.description}
        backHref={backToList}
        webUrl={repository?.webUrl}
      />

      {/* The repository read failing is reported inline rather than replacing
          the page: the pull requests may well have loaded, and they are what the
          user came for. */}
      {repositoryError ? (
        <RepositoryError
          title="Could not load repository details"
          error={repositoryError}
        />
      ) : repository ? (
        <Card padding="lg" className="edge-highlight">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Owner">{repository.owner?.name ?? "Unknown"}</Meta>

            <Meta label="Visibility">
              <Badge
                tone={visibility!.tone}
                size="sm"
                title={visibility!.hint}
              >
                {visibility!.label}
              </Badge>
            </Meta>

            <Meta label="Default branch" mono>
              {repository.defaultBranch ?? "Not reported"}
            </Meta>

            <Meta label="Last updated">
              {formatDateTime(repository.updatedAt) ?? "Not reported"}
            </Meta>
          </dl>

          {repository.webUrl ? (
            <>
              <Separator soft className="my-5" />
              <dl>
                <Meta label="Repository URL" mono>
                  <a
                    href={repository.webUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline-offset-4 hover:text-brand-200 hover:underline"
                  >
                    {repository.webUrl}
                  </a>
                </Meta>
              </dl>
            </>
          ) : null}
        </Card>
      ) : null}

      <section aria-labelledby="pull-requests" className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2
              id="pull-requests"
              className="text-lg font-medium tracking-tight text-ink-50"
            >
              Pull requests
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filtered at the provider, most recently updated first.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <PullRequestStateTabs
              active={state}
              hrefFor={(target) =>
                // Changing the filter resets the page: position in the open list
                // says nothing about position in the merged one.
                appRoutes.repository(providerCode, owner, repo, {
                  connection: connection.id,
                  state: target,
                  ...(search ? { search } : {}),
                })
              }
            />

            <RepositorySearch
              action={appRoutes.repository(providerCode, owner, repo)}
              value={search}
              label="Search pull requests"
              placeholder="Title, author, branch or #number…"
              preserve={{
                [repositoryBrowseParams.connection]: connection.id,
                [repositoryBrowseParams.state]: state,
              }}
              clearHref={appRoutes.repository(providerCode, owner, repo, {
                connection: connection.id,
                state,
              })}
            />
          </div>
        </div>

        {pullRequestsError ? (
          <RepositoryError
            title="Could not load pull requests"
            error={pullRequestsError}
          />
        ) : pullRequests && pullRequests.content.length > 0 ? (
          <>
            <Card padding="none" tone="flat">
              <ul>
                {pullRequests.content.map((pullRequest) => (
                  <PullRequestRow
                    key={pullRequest.id}
                    pullRequest={pullRequest}
                    providerCode={providerCode}
                    owner={owner}
                    repo={repo}
                    connectionId={connection.id}
                  />
                ))}
              </ul>
            </Card>

            <PageNav
              page={page}
              hasNext={pullRequests.hasNext}
              totalElements={pullRequests.totalElements}
              pageSize={PAGE_SIZE}
              itemCount={pullRequests.content.length}
              label="pull requests"
              hrefForPage={(target) =>
                appRoutes.repository(
                  providerCode,
                  owner,
                  repo,
                  browse({ page: target }),
                )
              }
            />
          </>
        ) : (
          <Card padding="none" tone="flat">
            <EmptyState
              title={
                search
                  ? `No ${pullRequestStateFilterLabel(state).toLowerCase()} pull requests match "${search}"`
                  : `No ${pullRequestStateFilterLabel(state).toLowerCase()} pull requests`
              }
              description={
                search
                  ? "Search covers the title, author and branch names, and looks at a bounded number of pull requests — so an older one may not have been checked."
                  : state === "OPEN"
                    ? "Nothing is open for review in this repository right now. Try another filter to see its history."
                    : "Nothing in this repository matches that filter."
              }
              action={
                state === "ALL" && !search ? null : (
                  <Link
                    href={appRoutes.repository(providerCode, owner, repo, {
                      connection: connection.id,
                      state: "ALL",
                    })}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Show all pull requests
                  </Link>
                )
              }
            />
          </Card>
        )}
      </section>
    </div>
  );
}

function RepositoryHeader({
  fullName,
  name,
  description,
  backHref,
  webUrl,
}: {
  fullName: string;
  name: string;
  description?: string | undefined;
  backHref: string;
  webUrl?: string | undefined;
}) {
  return (
    <PageHeader
      eyebrow="Repository"
      title={name}
      description={
        <>
          <span className="block font-mono text-xs text-subtle-foreground">
            {fullName}
          </span>
          {description ? <span className="mt-2 block">{description}</span> : null}
        </>
      }
      backTo={{ href: backHref, label: "Back to repositories" }}
      actions={
        webUrl ? (
          <a
            href={webUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open at provider
          </a>
        ) : null
      }
    />
  );
}

function Meta({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "mt-1.5 truncate font-mono text-[0.8125rem] text-ink-200"
            : "mt-1.5 truncate text-sm text-ink-200"
        }
      >
        {children}
      </dd>
    </div>
  );
}

/**
 * Narrows a settled read to an `ApiError`, or `undefined` when it succeeded.
 *
 * A rejection that is not an `ApiError` is a programming fault rather than a
 * backend outcome, so it is rethrown to the error boundary instead of being
 * rendered as a friendly message that would hide it.
 */
function asApiError(result: PromiseSettledResult<unknown>): ApiError | undefined {
  if (result.status === "fulfilled") return undefined;
  if (result.reason instanceof ApiError) return result.reason;
  throw result.reason;
}
