import "server-only";

import {
  endpoints,
  type PageQueryParams,
  type PullRequestListQuery,
  type RepositoryListQuery,
} from "@/lib/api/endpoints";
import { apiRequestData } from "@/lib/api/server";
import type {
  PageResponse,
  PullRequestDiffResponse,
  PullRequestFileResponse,
  PullRequestResponse,
  RepositoryResponse,
} from "@/lib/api/types";

/**
 * Typed access to the Repository Management endpoints.
 *
 * Mirrors `lib/scm/service.ts`: thin wrappers that take an access token rather
 * than reading cookies themselves, so the caller decides whether a refresh is
 * possible. Every function here is a read, so all are safe from a Server
 * Component — middleware has already ensured the token is fresh before a
 * protected page renders.
 *
 * No write wrappers exist, because the module adds no write endpoints.
 * Repositories and pull requests are provider resources; nothing in this feature
 * mutates them.
 *
 * Every call throws `ApiError` on a non-2xx, carrying the backend's
 * `ScmErrorCode` on `.code`.
 *
 * **Every function takes a `connectionId`, and that is the whole shape of the
 * feature.** A repository has no identity independent of the authorization it is
 * read through, so there is no "get repository" that does not say through whose
 * credential. The backend resolves `user -> connection -> repository -> pull
 * request` and refuses any link it cannot establish.
 */

/**
 * `GET /api/v1/scm/connections/{connectionId}/repositories`
 *
 * `search` matches name, full name and description. It is applied server-side
 * over a bounded scan of provider pages, so **a missing `totalElements` on a
 * search response means more matches may exist beyond what was scanned** — not
 * that there are none. Drive page controls from `hasNext`.
 */
export async function fetchRepositories(
  accessToken: string,
  connectionId: number,
  query?: RepositoryListQuery,
): Promise<PageResponse<RepositoryResponse>> {
  return apiRequestData<PageResponse<RepositoryResponse>>(
    endpoints.scm.repositories(connectionId, query),
    { accessToken },
  );
}

/**
 * `GET /api/v1/scm/connections/{connectionId}/repositories/{owner}/{repo}`
 *
 * Addressed by owner-qualified name, not by the provider's repository id — no
 * backend route accepts the id. Split a repository's `fullName` with
 * `splitRepositoryFullName` to get these two values.
 *
 * A repository this connection's credential cannot see answers 404
 * `SCM_REPOSITORY_NOT_FOUND`. Providers deliberately do not distinguish "absent"
 * from "invisible to you", so neither can this.
 */
export async function fetchRepository(
  accessToken: string,
  connectionId: number,
  owner: string,
  repo: string,
): Promise<RepositoryResponse> {
  return apiRequestData<RepositoryResponse>(
    endpoints.scm.repository(connectionId, owner, repo),
    { accessToken },
  );
}

/**
 * `GET .../repositories/{owner}/{repo}/pull-requests`
 *
 * `state` is one of `pullRequestStateFilters` and is applied **by the provider**,
 * not in memory — each provider's operation configuration declares how to spell
 * the canonical value. Omit it and the backend defaults to `OPEN`; send something
 * unrecognised and it is a 400 rather than a quietly defaulted list.
 *
 * A 404 here is `SCM_REPOSITORY_NOT_FOUND`: the listing addresses no pull
 * request, so the repository is what is missing.
 */
export async function fetchPullRequests(
  accessToken: string,
  connectionId: number,
  owner: string,
  repo: string,
  query?: PullRequestListQuery,
): Promise<PageResponse<PullRequestResponse>> {
  return apiRequestData<PageResponse<PullRequestResponse>>(
    endpoints.scm.pullRequests(connectionId, owner, repo, query),
    { accessToken },
  );
}

/**
 * `GET .../pull-requests/{pullRequestNumber}`
 *
 * Keyed by the pull-request **number**, not its `id`: on at least one provider
 * they are different integers and only the number is accepted in a URL.
 *
 * The response carries a `repository` reference, so a detail page does not need
 * a second call to name the repository it is inside.
 */
export async function fetchPullRequest(
  accessToken: string,
  connectionId: number,
  owner: string,
  repo: string,
  pullRequestNumber: number,
): Promise<PullRequestResponse> {
  return apiRequestData<PullRequestResponse>(
    endpoints.scm.pullRequest(connectionId, owner, repo, pullRequestNumber),
    { accessToken },
  );
}

/**
 * `GET .../pull-requests/{pullRequestNumber}/files`
 *
 * Paged, because both providers page it and a pull request touching several
 * hundred files is ordinary where generated code or lockfiles are committed.
 *
 * Carries no patch content — see `PullRequestFileResponse`. Use
 * `fetchPullRequestDiff` for that.
 */
export async function fetchPullRequestFiles(
  accessToken: string,
  connectionId: number,
  owner: string,
  repo: string,
  pullRequestNumber: number,
  query?: PageQueryParams,
): Promise<PageResponse<PullRequestFileResponse>> {
  return apiRequestData<PageResponse<PullRequestFileResponse>>(
    endpoints.scm.pullRequestFiles(
      connectionId,
      owner,
      repo,
      pullRequestNumber,
      query,
    ),
    { accessToken },
  );
}

/**
 * `GET .../pull-requests/{pullRequestNumber}/diff`
 *
 * Already parsed into files, hunks and lines with both sets of line numbers
 * resolved, so rendering it is a map over arrays rather than a parse.
 *
 * Not paged — a diff is one provider response — but bounded by a server-side
 * parse budget. Check `truncated` before presenting the file count as complete.
 */
export async function fetchPullRequestDiff(
  accessToken: string,
  connectionId: number,
  owner: string,
  repo: string,
  pullRequestNumber: number,
): Promise<PullRequestDiffResponse> {
  return apiRequestData<PullRequestDiffResponse>(
    endpoints.scm.pullRequestDiff(connectionId, owner, repo, pullRequestNumber),
    { accessToken },
  );
}
