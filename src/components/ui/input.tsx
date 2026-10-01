import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const fieldBase = [
  "w-full rounded-lg border bg-ink-950/60 text-sm text-ink-100",
  "placeholder:text-subtle-foreground",
  "border-border-strong",
  "transition-[border-color,box-shadow,background-color] duration-200",
  "hover:border-ink-600",
  "focus:border-brand-500 focus:bg-ink-950/90 focus:outline-none",
  "focus:shadow-[0_0_0_3px_oklch(0.55_0.225_278/0.18)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-[invalid=true]:border-signal-fail/60",
  "aria-[invalid=true]:focus:shadow-[0_0_0_3px_oklch(0.66_0.21_16/0.18)]",
];

type InputProps = ComponentProps<"input"> & {
  /** Rendered inside the field, before the text. */
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
};

export function Input({
  className,
  startAdornment,
  endAdornment,
  ...props
}: InputProps) {
  const input = (
    <input
      className={cn(
        fieldBase,
        "h-10 px-3",
        startAdornment && "pl-9",
        endAdornment && "pr-9",
        className,
      )}
      {...props}
    />
  );

  if (!startAdornment && !endAdornment) return input;

  return (
    <div className="relative">
      {startAdornment ? (
        <span
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle-foreground"
          aria-hidden
        >
          {startAdornment}
        </span>
      ) : null}

      {input}

      {endAdornment ? (
        <span
          className="absolute top-1/2 right-3 -translate-y-1/2 text-subtle-foreground"
          aria-hidden
        >
          {endAdornment}
        </span>
      ) : null}
    </div>
  );
}

export function Textarea({
  className,
  rows = 4,
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={cn(fieldBase, "resize-y px-3 py-2.5", className)}
      {...props}
    />
  );
}

type SelectProps = ComponentProps<"select">;

/**
 * Styled native select. Native is deliberate: it gets mobile pickers,
 * keyboard behaviour and accessibility for free.
 */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          fieldBase,
          "h-10 cursor-pointer appearance-none py-0 pr-9 pl-3",
          className,
        )}
        {...props}
      >
        {children}
      </select>

      <svg
        viewBox="0 0 12 12"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-subtle-foreground"
      >
        <path
          d="M2.5 4.5 6 8l3.5-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export type { InputProps, SelectProps };
