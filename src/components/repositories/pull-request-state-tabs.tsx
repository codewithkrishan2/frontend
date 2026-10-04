import Link from "next/link";

import {
  pullRequestStateFilters,
  type PullRequestStateFilter,
} from "@/lib/api/endpoints";
import { pullRequestStateFilterLabel } from "@/lib/repositories/presentation";
import { cn } from "@/lib/utils";

type PullRequestStateTabsProps = {
  active: PullRequestStateFilter;
  /** Builds the href for a filter. */
  hrefFor: (state: PullRequestStateFilter) => string;
};

/**
 * The Open / Merged / Closed / All filter.
 *
 * **Links, and the filtering happens at the provider.** Each tab is a URL that
 * the Server Component reads and passes to the backend, which passes the
 * canonical state through to the provider's own query — so a repository with
 * thousands of closed pull requests costs one page, not a full download followed
 * by a client-side filter.
 *
 * **Not the `Tabs` primitive.** That component owns an active tab in client
 * state and swaps panels without navigating, which is right for content already
 * on the page and wrong here: each filter is a separate backend read, and the
 * result should be a shareable URL with working back-button behaviour. Using it
 * would also mean fetching all four lists up front to have panels to swap.
 *
 * `aria-current="page"` rather than a `role="tablist"` for the same reason:
 * these navigate, so they are navigation, and announcing them as tabs would
 * promise in-place panel switching that does not happen.
 */
export function PullRequestStateTabs({
  active,
  hrefFor,
}: PullRequestStateTabsProps) {
  return (
    <nav
      aria-label="Filter pull requests by state"
      className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-ink-950/50 p-1"
    >
      {pullRequestStateFilters.map((filter) => {
        const current = filter === active;

        return (
          <Link
            key={filter}
            href={hrefFor(filter)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              current
                ? "bg-brand-500/15 font-medium text-ink-50"
                : "text-muted-foreground hover:bg-white/4 hover:text-ink-100",
            )}
          >
            {pullRequestStateFilterLabel(filter)}
          </Link>
        );
      })}
    </nav>
  );
}

export type { PullRequestStateTabsProps };
