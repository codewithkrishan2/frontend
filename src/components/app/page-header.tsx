import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Primary controls for the page, right-aligned on wide viewports. */
  actions?: ReactNode;
  /** Small label above the title, e.g. a section name. */
  eyebrow?: string;
  /** Rendered above everything as a back affordance on detail pages. */
  backTo?: { href: string; label: string };
  className?: string;
};

/**
 * The `h1` block every authenticated page opens with.
 *
 * Shared so the heading level, gradient treatment and action placement stay
 * identical across the app — `AppShell` owns the chrome but deliberately not the
 * title, since only the page knows it.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  backTo,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {backTo ? (
        <Link
          href={backTo.href}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink-100"
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M9.5 3.5 5 8l4.5 4.5" />
          </svg>
          {backTo.label}
        </Link>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-xs font-medium tracking-wider text-brand-300 uppercase">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="text-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>

          {description ? (
            <div className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export type { PageHeaderProps };
