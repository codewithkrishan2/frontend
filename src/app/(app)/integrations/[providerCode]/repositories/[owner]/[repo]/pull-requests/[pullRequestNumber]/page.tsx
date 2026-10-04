import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { ChangedFilesList } from "@/components/repositories/changed-files-list";
import { DiffViewer } from "@/components/repositories/diff-viewer";
import { PageNav } from "@/components/repositories/page-nav";
import { RepositoryError } from "@/components/repositories/repository-error";
import {
  Alert,
  Badge,
  buttonVariants,
  Card,
  Separator,
} from "@/components/ui";
import {
  appRoutes,
  repositoryBrowseParams,
  type RepositoryBrowseParams,
} from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type {
  PageResponse,
  PullRequestDiffResponse,
  PullRequestFileResponse,
  PullRequestResponse,
} from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import {
  formatDateTime,
  pullRequestState,
  readConnectionParam,
  readPageParam,
  resolveBrowseConnection,
} from "@/lib/repositories/presentation";
import {
  fetchPullRequest,
  fetchPullRequestDiff,
  fetchPullRequestFiles,
} from "@/lib/repositories/service";
import { fetchScmConnections } from "@/lib/scm/service";

export const metadata: Metadata = {
  title: "Pull request",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Changed files per page.
 *
 * Larger than the repository and pull-request lists because this list is short
 * rows that are scanned rather than read, and because a reviewer wants the whole
 * file list in view before deciding where to look. It stays under the backend's
 * cap of 100.
 */
const FILES_PAGE_SIZE = 100;

/**
 * One pull request: details, changed files, then the diff.
 *
 * **Three independent reads, issued together.** The detail, the file list and
 * the diff all address the same pull request and none depends on another, so
 * running them in parallel makes the page as fast as its slowest call rather
 * than the sum of three. `allSettled` because they fail independently and
 * usefully: the diff is by far the largest response and the most likely to be
 * rate-limited or truncated, and losing it should not cost the user the details
 * and the file list, which are often enough to answer their question.
 *
 * That is the whole shape of this page — it is the last step of the flow this
 * module exists to deliver, and the data a later review module will build on.
 */
export default async function PullRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{
    providerCode: string;
    owner: string;
    repo: string;
    pullRequestNumber: string;
  }>;
  searchParams: SearchParams;
}) {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  const { providerCode, owner, repo, pullRequestNumber } = await params;
  const query = await searchParams;

  const number = Number.parseInt(pullRequestNumber, 10);

  // notFound() throws a sentinel Next.js catches, so it stays outside every try.
  // A non-numeric or non-positive segment can never identify a pull request, and
  // the backend would answer 400 for it — a 404 is the honest local answer.
  if (!Number.isInteger(number) || number < 1) {
    notFound();
  }

  const requestedConnection = readConnectionParam(
    query[repositoryBrowseParams.connection],
  );
  const filesPage = readPageParam(query[repositoryBrowseParams.page]);

  const backToRepository = appRoutes.repository(
    providerCode,
    owner,
    repo,
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
          <PullRequestHeader
            number={number}
            title={undefined}
            backHref={backToRepository}
            repoFullName={`${owner}/${repo}`}
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
        <PullRequestHeader
          number={number}
          title={undefined}
          backHref={backToRepository}
          repoFullName={`${owner}/${repo}`}
        />
        <Alert
          tone="fail"
          title={
            requestedUnavailable
              ? "That account is not available"
              : `No active ${providerCode} account`
          }
        >
          This pull request can only be read through a live connection to{" "}
          {providerCode}.
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

  const [detailResult, filesResult, diffResult] = await Promise.allSettled([
    fetchPullRequest(session.accessToken, connection.id, owner, repo, number),
    fetchPullRequestFiles(
      session.accessToken,
      connection.id,
      owner,
      repo,
      number,
      { page: filesPage - 1, size: FILES_PAGE_SIZE },
    ),
    fetchPullRequestDiff(
      session.accessToken,
      connection.id,
      owner,
      repo,
      number,
    ),
  ]);

  for (const result of [detailResult, filesResult, diffResult]) {
    if (
      result.status === "rejected" &&
      result.reason instanceof ApiError &&
      result.reason.isUnauthorized
    ) {
      redirect(appRoutes.signOut);
    }
  }

  const detail: PullRequestResponse | undefined =
    detailResult.status === "fulfilled" ? detailResult.value : undefined;

  const detailError = asApiError(detailResult);
  const filesError = asApiError(filesResult);
  const diffError = asApiError(diffResult);

  const files: PageResponse<PullRequestFileResponse> | undefined =
    filesResult.status === "fulfilled" ? filesResult.value : undefined;

  const diff: PullRequestDiffResponse | undefined =
    diffResult.status === "fulfilled" ? diffResult.value : undefined;

  // A pull request that does not exist is a 404 for the whole page, not an
  // inline error: there is nothing else on the page worth showing. Checked
  // outside any try so the sentinel reaches Next.js and the status survives.
  if (detailError?.code === "SCM_PULL_REQUEST_NOT_FOUND") {
    notFound();
  }

  const state = detail ? pullRequestState(detail.state) : undefined;

  const browse = (
    overrides: RepositoryBrowseParams,
  ): RepositoryBrowseParams => ({
    connection: connection.id,
    ...overrides,
  });

  return (
    <div className="flex flex-col gap-8">
      <PullRequestHeader
        number={number}
        title={detail?.title}
        backHref={backToRepository}
        repoFullName={detail?.repository?.fullName ?? `${owner}/${repo}`}
        webUrl={detail?.webUrl}
      />

      {detailError ? (
        <RepositoryError
          title="Could not load pull request details"
          error={detailError}
        />
      ) : detail ? (
        <Card padding="lg" className="edge-highlight">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={state!.tone}>{state!.label}</Badge>

            {detail.sourceBranch && detail.targetBranch ? (
              <p className="flex min-w-0 items-center gap-2 font-mono text-xs">
                <span className="truncate text-ink-200">
                  {detail.sourceBranch}
                </span>
                <span aria-hidden className="text-subtle-foreground">
                  →
                </span>
                <span className="truncate text-ink-200">
                  {detail.targetBranch}
                </span>
              </p>
            ) : null}
          </div>

          <Separator soft className="my-5" />

          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Author">
              {detail.author?.username ?? "Unknown author"}
            </Meta>
            <Meta label="Opened">
              {formatDateTime(detail.createdAt) ?? "Not reported"}
            </Meta>
            <Meta label="Last updated">
              {formatDateTime(detail.updatedAt) ?? "Not reported"}
            </Meta>
            {/* Only shown when it happened. An empty "Merged —" row on an open
                pull request would be noise on the common case. */}
            <Meta label={detail.mergedAt ? "Merged" : "Repository"}>
              {detail.mergedAt
                ? (formatDateTime(detail.mergedAt) ?? "Merged")
                : (detail.repository?.fullName ?? `${owner}/${repo}`)}
            </Meta>
          </dl>

          {detail.description ? (
            <>
              <Separator soft className="my-5" />
              <div>
                <h2 className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">
                  Description
                </h2>
                {/*
                  Rendered as pre-wrapped plain text, not as Markdown.

                  Providers return the raw author-written body, which is
                  untrusted user input. Rendering it as Markdown means rendering
                  embedded HTML, and a pull-request description is an obvious
                  place to put a payload. Plain text is both safe and honest
                  about what is being shown; Markdown here would need a
                  sanitiser and a dependency this app does not have.
                */}
                <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-wrap text-ink-200">
                  {detail.description}
                </p>
              </div>
            </>
          ) : null}
        </Card>
      ) : null}

      <section aria-labelledby="changed-files" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="changed-files"
              className="text-lg font-medium tracking-tight text-ink-50"
            >
              Changed files
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {files
                ? `${files.content.length} ${files.content.length === 1 ? "file" : "files"} on this page`
                : "The files this pull request touches."}
            </p>
          </div>
        </div>

        {filesError ? (
          <RepositoryError
            title="Could not load changed files"
            error={filesError}
          />
        ) : files ? (
          <>
            <ChangedFilesList files={files.content} />
            <PageNav
              page={filesPage}
              hasNext={files.hasNext}
              totalElements={files.totalElements}
              pageSize={FILES_PAGE_SIZE}
              itemCount={files.content.length}
              label="files"
              hrefForPage={(target) =>
                appRoutes.pullRequest(
                  providerCode,
                  owner,
                  repo,
                  number,
                  browse({ page: target }),
                )
              }
            />
          </>
        ) : null}
      </section>

      <section aria-labelledby="diff" className="flex flex-col gap-4">
        <div>
          <h2 id="diff" className="text-lg font-medium tracking-tight text-ink-50">
            Diff
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Added, removed and surrounding lines, file by file.
          </p>
        </div>

        {/* The diff is the largest response on the page and the most likely to
            be rate-limited, so its failure is confined here — the details and
            file list above are often enough on their own. */}
        {diffError ? (
          <RepositoryError title="Could not load the diff" error={diffError} />
        ) : diff ? (
          <DiffViewer diff={diff} />
        ) : null}
      </section>
    </div>
  );
}

function PullRequestHeader({
  number,
  title,
  backHref,
  repoFullName,
  webUrl,
}: {
  number: number;
  title: string | undefined;
  backHref: string;
  repoFullName: string;
  webUrl?: string | undefined;
}) {
  return (
    <PageHeader
      eyebrow={`Pull request #${number}`}
      title={title ?? `#${number}`}
      description={
        <span className="block font-mono text-xs text-subtle-foreground">
          {repoFullName}
        </span>
      }
      backTo={{ href: backHref, label: "Back to pull requests" }}
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 truncate text-sm text-ink-200">{children}</dd>
    </div>
  );
}

/**
 * Narrows a settled read to an `ApiError`, or `undefined` when it succeeded.
 *
 * A rejection that is not an `ApiError` is a programming fault rather than a
 * backend outcome, so it is rethrown to the error boundary rather than rendered
 * as a friendly message that would hide it.
 */
function asApiError(
  result: PromiseSettledResult<unknown>,
): ApiError | undefined {
  if (result.status === "fulfilled") return undefined;
  if (result.reason instanceof ApiError) return result.reason;
  throw result.reason;
}
