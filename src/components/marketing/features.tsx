import type { ReactNode } from "react";

import {
  SectionHeading,
  type RoutableSectionProps,
} from "@/components/marketing/section-heading";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Card, Container } from "@/components/ui";
import { cn } from "@/lib/utils";

type Feature = {
  title: string;
  body: string;
  icon: ReactNode;
  /** Spans two columns on large screens. */
  wide?: boolean;
};

/* Icons are inline 20px strokes on a shared 20-unit grid. Inlining avoids an
   icon dependency for a fixed, small set. */

function IconScan() {
  return (
    <IconFrame>
      <path d="M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7M13 3h2.5A1.5 1.5 0 0 1 17 4.5V7M17 13v2.5a1.5 1.5 0 0 1-1.5 1.5H13M7 17H4.5A1.5 1.5 0 0 1 3 15.5V13" />
      <path d="M3 10h14" opacity="0.5" />
    </IconFrame>
  );
}

function IconGraph() {
  return (
    <IconFrame>
      <circle cx="5" cy="15" r="2" />
      <circle cx="15" cy="5" r="2" />
      <circle cx="15" cy="14" r="1.6" />
      <path d="M6.6 13.6 13.4 6.4M6.9 15h6.5" />
    </IconFrame>
  );
}

function IconShield() {
  return (
    <IconFrame>
      <path d="M10 3 4.5 5v5c0 3.2 2.3 5.8 5.5 7 3.2-1.2 5.5-3.8 5.5-7V5L10 3Z" />
      <path d="M7.75 9.75 9.5 11.5l3-3.25" />
    </IconFrame>
  );
}

function IconComment() {
  return (
    <IconFrame>
      <path d="M17 11.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3v-3H5.5A2.5 2.5 0 0 1 3 11.5v-5A2.5 2.5 0 0 1 5.5 4h9A2.5 2.5 0 0 1 17 6.5v5Z" />
      <path d="M7 8h6M7 10.5h3.5" opacity="0.6" />
    </IconFrame>
  );
}

function IconGauge() {
  return (
    <IconFrame>
      <path d="M4 14a6.5 6.5 0 1 1 12 0" />
      <path d="M10 14l3-3.5" />
      <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

function IconSearch() {
  return (
    <IconFrame>
      <circle cx="9" cy="9" r="5" />
      <path d="M12.8 12.8 17 17" />
    </IconFrame>
  );
}

function IconSpark() {
  return (
    <IconFrame>
      <path d="M10 3.5l1.6 4.1 4.4 1.4-4.4 1.4L10 16.5l-1.6-6.1L4 9l4.4-1.4L10 3.5Z" />
    </IconFrame>
  );
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      {children}
    </svg>
  );
}

const features: readonly Feature[] = [
  {
    title: "AI pull request analysis",
    body: "Every diff is read against the surrounding architecture, then summarised into what changed, what it affects, and what deserves a second look.",
    icon: <IconScan />,
    wide: true,
  },
  {
    title: "Repository intelligence",
    body: "A live map of modules, contracts and call paths, so cross-cutting changes stop hiding.",
    icon: <IconGraph />,
  },
  {
    title: "Security insights",
    body: "Auth boundaries, input handling and secret exposure are checked on the paths a diff actually touches.",
    icon: <IconShield />,
  },
  {
    title: "Review assistance",
    body: "Draft comments written in your team's voice, anchored to the exact line they refer to.",
    icon: <IconComment />,
  },
  {
    title: "Code quality signals",
    body: "Complexity, duplication and coupling tracked over time, per service and per team.",
    icon: <IconGauge />,
  },
  {
    title: "Ask your repository",
    body: "Natural-language questions answered with citations back to the files and commits behind the answer.",
    icon: <IconSearch />,
    wide: true,
  },
  {
    title: "Actionable recommendations",
    body: "Prioritised, specific next steps — not a wall of warnings to triage by hand.",
    icon: <IconSpark />,
  },
];

export function Features({ headingLevel }: RoutableSectionProps = {}) {
  return (
    <section
      id="features"
      className="relative scroll-mt-24 py-20 sm:py-28"
      aria-labelledby="features-heading"
    >
      <Container width="wide">
        <SectionHeading
          as={headingLevel}
          eyebrow="Capabilities"
          title={
            <span id="features-heading">
              Everything a senior reviewer would check
            </span>
          }
          description="CodeRev is built around the parts of review that need judgement, not the parts a formatter already solved."
        />

        <Stagger
          as="ul"
          gap={0.07}
          className="mt-14 grid list-none gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <StaggerItem
              as="li"
              key={feature.title}
              className={cn(feature.wide && "lg:col-span-2")}
            >
              <Card
                interactive
                padding="md"
                className="group edge-highlight h-full overflow-hidden"
              >
                {/* Icon tile */}
                <div className="inline-flex size-10 items-center justify-center rounded-lg border border-border-strong bg-ink-850 text-brand-300 transition-colors duration-300 group-hover:border-brand-500/35 group-hover:text-brand-200">
                  {feature.icon}
                </div>

                <h3 className="mt-4 font-medium tracking-tight text-ink-50">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>

                {/* Hover sheen, purely decorative */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
