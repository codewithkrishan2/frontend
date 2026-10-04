import Link from "next/link";

import { buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";

type PageNavProps = {
  /** 1-based, as shown to the user. */
  page: number;
  hasNext: boolean;
  /** Absent when the source does not publish one — see the note below. */
  totalElements?: number | undefined;
  /** Items on the current page, for the "showing x–y" range. */
  pageSize: number;
  itemCount: number;
  /** Builds the href for a page. Pages are 1-based. */
  hrefForPage: (page: number) => string;
  /** Plural noun for the range label, e.g. "repositories". */
  label: string;
  className?: string;
};

/**
 * Previous/next pagination for a provider-backed list.
 *
 * **Not the `Pagination` primitive**, and the reason is the data rather than
 * taste. That component takes a `pageCount` and renders numbered buttons, which
 * requires knowing how many pages there are — and these lists usually do not.
 * Neither GitHub's repository listing nor Bitbucket's pull-request listing
 * publishes a total; both say only "there is another page". Numbered pagination
 * over that would mean inventing a page count, and an invented count is worse
 * than none because a user cannot tell it is wrong.
 *
 * So this renders exactly what the data supports: where you are, whether there
 * is more, and how to get there. When a total *is* present — which happens for a
 * search that reached the end of the provider's data — it is shown, because then
 * it is real.
 *
 * **Rendered as links, not buttons.** No client JavaScript, so paging works
 * before hydration and on a failed bundle load, and each page is a real URL that
 * can be shared or reached with the back button. The same reasoning applies to
 * the search field and the state filters.
 */
export function PageNav({
  page,
  hasNext,
  totalElements,
  pageSize,
  itemCount,
  hrefForPage,
  label,
  className,
}: PageNavProps) {
  // Nothing to navigate: one page, and it is the only one.
  if (page === 1 && !hasNext) return null;

  const firstOnPage = (page - 1) * pageSize + 1;
  const lastOnPage = firstOnPage + Math.max(itemCount, 1) - 1;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        {itemCount === 0 ? (
          <>No {label} on this page</>
        ) : (
          <>
            Showing {firstOnPage}–{lastOnPage}
            {/* Only claimed when the backend actually published a total. */}
            {totalElements !== undefined ? <> of {totalElements}</> : null}{" "}
            {label}
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        {/* Disabled edges are rendered as spans rather than links: a disabled
            anchor is not a thing, and an anchor with no href is still focusable
            and announced as a link. */}
        {page > 1 ? (
          <Link
            href={hrefForPage(page - 1)}
            rel="prev"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Chevron direction="left" />
            Previous
          </Link>
        ) : (
          <EdgeMarker>
            <Chevron direction="left" />
            Previous
          </EdgeMarker>
        )}

        <span className="px-1 text-xs tabular-nums text-muted-foreground">
          Page {page}
        </span>

        {hasNext ? (
          <Link
            href={hrefForPage(page + 1)}
            rel="next"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Next
            <Chevron direction="right" />
          </Link>
        ) : (
          <EdgeMarker>
            Next
            <Chevron direction="right" />
          </EdgeMarker>
        )}
      </div>
    </nav>
  );
}

function EdgeMarker({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-disabled
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </span>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="size-3">
      <path
        d={
          direction === "left"
            ? "M7.5 2.5 4 6l3.5 3.5"
            : "M4.5 2.5 8 6l-3.5 3.5"
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type { PageNavProps };
