import Link from "next/link";

import { Badge } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import type { PullRequestResponse } from "@/lib/api/types";
import {
  formatDate,
  formatRelativeDay,
  pullRequestState,
} from "@/lib/repositories/presentation";

type PullRequestRowProps = {
  pullRequest: PullRequestResponse;
  providerCode: string;
  owner: string;
  repo: string;
  connectionId: number;
};

/**
 * One pull request in a repository's list.
 *
 * Reads as a title first and metadata second, with the number as a quiet prefix:
 * the number is how a pull request is *referred to*, but the title is how it is
 * *recognised*, and a list that leads with "#123" makes every row start the same
 * way.
 *
 * The state badge sits with the title rather than in its own column, so a row
 * stays legible when it wraps on a narrow viewport — a column layout would put
 * the state far from the title it describes.
 *
 * Branches are shown as `source → target` because a reviewer frequently
 * remembers the branch rather than the title, and because the target matters:
 * a pull request into a release branch is a different thing from one into main.
 */
export function PullRequestRow({
  pullRequest,
  providerCode,
  owner,
  repo,
  connectionId,
}: PullRequestRowProps) {
  const state = pullRequestState(pullRequest.state);
  const updated = formatRelativeDay(pullRequest.updatedAt);

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex flex-col gap-2 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <Badge tone={state.tone} size="sm">
            {state.label}
          </Badge>

          <h3 className="min-w-0 flex-1 text-sm font-medium text-ink-50">
            <Link
              href={appRoutes.pullRequest(
                providerCode,
                owner,
                repo,
                pullRequest.number,
                { connection: connectionId },
              )}
              className="underline-offset-4 hover:text-brand-200 hover:underline"
            >
              <span className="text-subtle-foreground">
                #{pullRequest.number}
              </span>{" "}
              {pullRequest.title ?? "Untitled pull request"}
            </Link>
          </h3>
        </div>

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-subtle-foreground">
          {/* An absent author is a real case — a pull request opened by a
              since-deleted account — so it is stated rather than left blank. */}
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Author</dt>
            <dd>{pullRequest.author?.username ?? "Unknown author"}</dd>
          </div>

          {pullRequest.sourceBranch && pullRequest.targetBranch ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="sr-only">Branches</dt>
              <dd className="flex min-w-0 items-center gap-1.5 font-mono">
                <span className="truncate text-ink-300">
                  {pullRequest.sourceBranch}
                </span>
                <span aria-hidden className="text-subtle-foreground">
                  →
                </span>
                <span className="truncate text-ink-300">
                  {pullRequest.targetBranch}
                </span>
              </dd>
            </div>
          ) : null}

          {updated ? (
            <div className="flex items-center gap-1.5">
              <dt>Updated</dt>
              <dd title={formatDate(pullRequest.updatedAt) ?? undefined}>
                {updated}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </li>
  );
}

export type { PullRequestRowProps };
