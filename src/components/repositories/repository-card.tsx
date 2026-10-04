import Link from "next/link";

import { Avatar, Badge, Card } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import {
  splitRepositoryFullName,
  type RepositoryResponse,
} from "@/lib/api/types";
import {
  formatDate,
  formatRelativeDay,
  repositoryVisibility,
} from "@/lib/repositories/presentation";

type RepositoryCardProps = {
  repository: RepositoryResponse;
  /** Carried into the link so the detail page reads through the same account. */
  connectionId: number;
};

/**
 * One repository in the list.
 *
 * Leads with the short name and puts the owner-qualified name underneath,
 * because a user scanning this list is looking for "the auth service", not for
 * "acme/auth-service" — the owner is the same on most rows and repeating it at
 * full weight would make every row start with the same word.
 *
 * **The link is built from `fullName`, never from `name`.** Where a provider
 * distinguishes a display name from a URL slug, `fullName` carries the slug; a
 * link built from `name` would 404 for any repository whose display name differs
 * from its slug. A `fullName` that is not owner-qualified means the card cannot
 * produce a working link, so it renders unlinked rather than linking somewhere
 * wrong.
 */
export function RepositoryCard({
  repository,
  connectionId,
}: RepositoryCardProps) {
  const ref = splitRepositoryFullName(repository.fullName);
  const visibility = repositoryVisibility(repository.visibility);
  const updated = formatRelativeDay(repository.updatedAt);

  const heading = (
    <span className="truncate text-base font-medium tracking-tight text-ink-50">
      {repository.name}
    </span>
  );

  return (
    <Card padding="md" interactive={ref !== null}>
      <div className="flex items-start gap-4">
        {repository.owner?.name ? (
          <Avatar
            name={repository.owner.name}
            src={repository.owner.avatarUrl ?? undefined}
            size="md"
            className="mt-0.5 shrink-0"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h3 className="min-w-0">
              {ref ? (
                <Link
                  href={appRoutes.repository(
                    repository.provider.code,
                    ref.owner,
                    ref.name,
                    { connection: connectionId },
                  )}
                  className="truncate text-base font-medium tracking-tight text-ink-50 underline-offset-4 hover:text-brand-200 hover:underline"
                >
                  {repository.name}
                </Link>
              ) : (
                heading
              )}
            </h3>

            <Badge tone={visibility.tone} size="sm" title={visibility.hint}>
              {visibility.label}
            </Badge>
          </div>

          <p className="mt-1 truncate font-mono text-xs text-subtle-foreground">
            {repository.fullName}
          </p>

          {repository.description ? (
            <p className="mt-2.5 line-clamp-2 text-sm text-muted-foreground">
              {repository.description}
            </p>
          ) : null}

          <dl className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-subtle-foreground">
            {repository.defaultBranch ? (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Default branch</dt>
                <BranchIcon />
                <dd className="font-mono text-ink-300">
                  {repository.defaultBranch}
                </dd>
              </div>
            ) : null}

            {updated ? (
              <div className="flex items-center gap-1.5">
                <dt>Updated</dt>
                {/* The coarse relative value is what makes the list scannable;
                    the exact date is one hover away rather than crowding it. */}
                <dd
                  className="text-ink-300"
                  title={formatDate(repository.updatedAt) ?? undefined}
                >
                  {updated}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </Card>
  );
}

function BranchIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <circle cx="4.5" cy="3.5" r="1.75" />
      <circle cx="4.5" cy="12.5" r="1.75" />
      <circle cx="11.5" cy="6.5" r="1.75" />
      <path d="M4.5 5.25v5.5" />
      <path d="M11.5 8.25c0 1.75-1.5 2.5-3.5 2.75" />
    </svg>
  );
}

export type { RepositoryCardProps };
