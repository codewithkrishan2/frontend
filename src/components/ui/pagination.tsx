"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Total row count, shown as context when provided. */
  totalItems?: number;
  pageSize?: number;
  className?: string;
};

/**
 * Builds a page list with ellipses, e.g. [1, "…", 4, 5, 6, "…", 20].
 * Always keeps the first, last and the window around the current page.
 */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const items: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) items.push("gap");
  for (let current = start; current <= end; current += 1) items.push(current);
  if (end < pageCount - 1) items.push("gap");

  items.push(pageCount);
  return items;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const items = pageItems(page, pageCount);

  const rangeStart = pageSize ? (page - 1) * pageSize + 1 : undefined;
  const rangeEnd =
    pageSize && totalItems ? Math.min(page * pageSize, totalItems) : undefined;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {totalItems !== undefined ? (
        <p className="text-xs text-muted-foreground">
          {rangeStart !== undefined && rangeEnd !== undefined
            ? `Showing ${rangeStart}–${rangeEnd} of ${totalItems}`
            : `${totalItems} total`}
        </p>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <Chevron direction="left" />
        </Button>

        {items.map((item, index) =>
          item === "gap" ? (
            <span
              key={`gap-${index}`}
              className="px-1.5 text-sm text-subtle-foreground"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "size-8 rounded-md text-sm font-medium tabular-nums transition-colors",
                item === page
                  ? "bg-brand-600 text-white"
                  : "text-muted-foreground hover:bg-ink-800 hover:text-ink-100",
              )}
            >
              {item}
            </button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <Chevron direction="right" />
        </Button>
      </div>
    </nav>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="size-3.5">
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

export type { PaginationProps };
