"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type TooltipProps = {
  /** Tooltip text. Keep it short; this is not a popover. */
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
};

/**
 * Lightweight tooltip. Shows on hover and on keyboard focus, and dismisses on
 * Escape, which is what makes it usable without a pointer.
 *
 * No positioning library: it is anchored with plain CSS, so it is only suitable
 * for triggers that are not near a clipping boundary.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>

      <span
        id={id}
        role="tooltip"
        aria-hidden={!open}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md border border-border-strong bg-ink-850 px-2 py-1 text-xs whitespace-nowrap text-ink-100 shadow-lg",
          "transition-[opacity,transform] duration-150 ease-out",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          open
            ? "translate-y-0 opacity-100"
            : side === "top"
              ? "pointer-events-none translate-y-1 opacity-0"
              : "pointer-events-none -translate-y-1 opacity-0",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}

export type { TooltipProps };
