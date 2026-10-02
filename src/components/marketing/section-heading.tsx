import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  /** Small label above the title. */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  /**
   * Heading level. `h2` suits a section on the landing page, where `Hero` owns
   * the `h1`; a section that is the subject of its own route has to be promoted
   * to `h1` or that page ships with no top-level heading.
   *
   * Only the level changes — the type scale is identical either way, because the
   * visual weight belongs to the section, not to the document outline.
   */
  as?: "h1" | "h2";
  className?: string;
};

/** Shared eyebrow + title + description block, so every section lines up. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "flex flex-col",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 font-mono text-xs tracking-[0.18em] text-brand-300 uppercase">
          {eyebrow}
        </p>
      ) : null}

      <Heading className="max-w-3xl text-display text-3xl font-semibold tracking-[-0.025em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
        {title}
      </Heading>

      {description ? (
        <p
          className={cn(
            "mt-4 max-w-2xl leading-relaxed text-muted-foreground",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}

export type { SectionHeadingProps };

/**
 * Props shared by every section that is also reachable as its own route.
 *
 * On the landing page the section is one of many, so its heading is an `h2`. On
 * its own route it is the page, so the route passes `headingLevel="h1"`.
 */
export type RoutableSectionProps = {
  headingLevel?: "h1" | "h2";
};
