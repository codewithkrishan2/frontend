import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  /** Small label above the title. */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

/** Shared eyebrow + title + description block, so every section lines up. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
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

      <h2 className="max-w-3xl text-display text-3xl font-semibold tracking-[-0.025em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
        {title}
      </h2>

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
