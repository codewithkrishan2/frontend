import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Low-level table primitives.
 *
 * Use these directly when a table's markup is bespoke. For the common case of
 * rendering rows from an array, prefer `DataTable`, which is built on top of
 * these and handles sorting, empty and loading states.
 */

/**
 * Scroll container. Tables are the most common source of horizontal overflow,
 * so the wrapper scrolls instead of letting the page widen.
 */
export function TableWrapper({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative w-full overflow-x-auto rounded-xl border border-border bg-ink-950/50",
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <table
      className={cn("w-full border-collapse text-left text-sm", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn(
        "[&_tr:not(:last-child)]:border-b [&_tr:not(:last-child)]:border-border",
        className,
      )}
      {...props}
    />
  );
}

export function TableFoot({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot
      className={cn("border-t border-border bg-ink-900/40", className)}
      {...props}
    />
  );
}

type TableRowProps = ComponentProps<"tr"> & {
  interactive?: boolean;
  selected?: boolean;
};

export function TableRow({
  className,
  interactive = false,
  selected = false,
  ...props
}: TableRowProps) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        "transition-colors duration-150",
        interactive && "hover:bg-ink-800/40",
        selected && "bg-brand-500/8",
        className,
      )}
      {...props}
    />
  );
}

type TableHeaderCellProps = ComponentProps<"th"> & {
  align?: "left" | "center" | "right";
};

export function TableHeaderCell({
  className,
  align = "left",
  ...props
}: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-xs font-medium tracking-wide text-subtle-foreground uppercase",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
      {...props}
    />
  );
}

type TableCellProps = ComponentProps<"td"> & {
  align?: "left" | "center" | "right";
};

export function TableCell({
  className,
  align = "left",
  ...props
}: TableCellProps) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-ink-200",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: ComponentProps<"caption">) {
  return (
    <caption
      className={cn(
        "caption-bottom px-4 py-3 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type { TableRowProps, TableCellProps, TableHeaderCellProps };
