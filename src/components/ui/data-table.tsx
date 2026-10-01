"use client";

import { useMemo, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Column definition.
 *
 * `T` is the row shape. Provide `sortValue` to make a column sortable; it maps
 * a row to a primitive the table can compare. Columns without it are not
 * sortable, which avoids guessing at how to order rendered ReactNodes.
 */
export type DataTableColumn<T> = {
  /** Stable identifier, also used as the React key. */
  id: string;
  /** Column heading. */
  header: ReactNode;
  /** Cell renderer. */
  cell: (row: T, rowIndex: number) => ReactNode;
  align?: "left" | "center" | "right";
  /** Extra classes on both the header cell and body cells. */
  className?: string;
  /** Hides the column below the given breakpoint, keeping mobile readable. */
  hideBelow?: "sm" | "md" | "lg";
  /** Enables sorting by returning a comparable value for a row. */
  sortValue?: (row: T) => string | number | boolean | null | undefined;
};

export type SortDirection = "asc" | "desc";

type DataTableProps<T> = {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  /** Stable React key per row. */
  rowKey: (row: T, index: number) => string;
  /** Column id to sort by initially. */
  defaultSortId?: string;
  defaultSortDirection?: SortDirection;
  onRowClick?: (row: T) => void;
  isRowSelected?: (row: T) => boolean;
  loading?: boolean;
  /** Skeleton rows drawn while `loading`. */
  loadingRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  caption?: string;
  className?: string;
};

const hideBelowClasses = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
} as const;

function compare(
  a: string | number | boolean | null | undefined,
  b: string | number | boolean | null | undefined,
): number {
  // Nullish values always sort last, regardless of direction.
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/**
 * Generic, sortable table.
 *
 * Sorting is client-side and intended for page-sized datasets. For server-side
 * paging, sort upstream and leave `sortValue` off the columns.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  defaultSortId,
  defaultSortDirection = "asc",
  onRowClick,
  isRowSelected,
  loading = false,
  loadingRows = 5,
  emptyTitle = "Nothing to show",
  emptyDescription,
  emptyAction,
  caption,
  className,
}: DataTableProps<T>) {
  const [sortId, setSortId] = useState<string | undefined>(defaultSortId);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(defaultSortDirection);

  const sortedRows = useMemo(() => {
    const column = columns.find((candidate) => candidate.id === sortId);
    const sortValue = column?.sortValue;

    if (!sortValue) return rows;

    const factor = sortDirection === "asc" ? 1 : -1;

    // Copy before sorting: never mutate the caller's array.
    return [...rows].sort(
      (a, b) => compare(sortValue(a), sortValue(b)) * factor,
    );
  }, [columns, rows, sortId, sortDirection]);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) return;

    if (sortId === column.id) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortId(column.id);
    setSortDirection("asc");
  }

  const hasRows = sortedRows.length > 0;

  return (
    <div className={cn("w-full", className)}>
      <TableWrapper>
        <Table>
          {caption ? (
            <caption className="caption-bottom px-4 py-3 text-xs text-muted-foreground">
              {caption}
            </caption>
          ) : null}

          <TableHead>
            <TableRow>
              {columns.map((column) => {
                const sortable = Boolean(column.sortValue);
                const isSorted = sortable && sortId === column.id;

                return (
                  <TableHeaderCell
                    key={column.id}
                    align={column.align}
                    aria-sort={
                      isSorted
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : sortable
                          ? "none"
                          : undefined
                    }
                    className={cn(
                      column.className,
                      column.hideBelow && hideBelowClasses[column.hideBelow],
                      sortable && "p-0",
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={cn(
                          "flex w-full items-center gap-1.5 px-4 py-3 transition-colors hover:text-ink-100",
                          column.align === "right" && "justify-end",
                          column.align === "center" && "justify-center",
                          isSorted && "text-ink-100",
                        )}
                      >
                        {column.header}
                        <SortGlyph
                          active={isSorted}
                          direction={sortDirection}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHeaderCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading
              ? Array.from({ length: loadingRows }, (_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          column.hideBelow &&
                            hideBelowClasses[column.hideBelow],
                        )}
                      >
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : sortedRows.map((row, rowIndex) => (
                  <TableRow
                    key={rowKey(row, rowIndex)}
                    interactive={Boolean(onRowClick)}
                    selected={isRowSelected?.(row) ?? false}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    // A clickable row needs to be reachable and activatable
                    // by keyboard, not just by pointer.
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? "button" : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    className={onRowClick ? "cursor-pointer" : undefined}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align}
                        className={cn(
                          column.className,
                          column.hideBelow &&
                            hideBelowClasses[column.hideBelow],
                        )}
                      >
                        {column.cell(row, rowIndex)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableWrapper>

      {!loading && !hasRows ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          className="mt-3 rounded-xl border border-dashed border-border"
        />
      ) : null}
    </div>
  );
}

function SortGlyph({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={cn(
        "size-3 shrink-0 transition-opacity",
        active ? "opacity-100" : "opacity-35",
      )}
    >
      <path
        d="M6 2.5 8.6 6H3.4L6 2.5Z"
        fill="currentColor"
        opacity={active && direction === "asc" ? 1 : 0.35}
      />
      <path
        d="M6 9.5 3.4 6h5.2L6 9.5Z"
        fill="currentColor"
        opacity={active && direction === "desc" ? 1 : 0.35}
      />
    </svg>
  );
}

export type { DataTableProps };
