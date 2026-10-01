import Link from "next/link";

import { CodeField } from "@/components/backdrop/code-field";
import { SectionGlow } from "@/components/backdrop/section-glow";
import { SpotlightSection } from "@/components/backdrop/spotlight-section";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { TextReveal } from "@/components/motion/text-reveal";
import { Tilt } from "@/components/motion/tilt";
import { ReviewConsole } from "@/components/marketing/review-console";
import { buttonVariants, Container } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

const capabilities = [
  "Pull request analysis",
  "Repository context",
  "Security signals",
  "Quality trends",
];

export function Hero() {
  return (
    // SpotlightSection publishes the pointer position as CSS variables that
    // CodeField reads to light up the characters under the cursor.
    <SpotlightSection className="relative isolate overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24">
      <CodeField />
      <SectionGlow tone="brand" position="center" className="top-10" />

      <Container width="wide">
        <div className="flex flex-col items-center text-center">
          {/* Eyebrow */}
          <Reveal from="none" duration={0.7}>
            <Link
              href="#product"
              className="group inline-flex items-center gap-2 rounded-full border border-border-strong bg-ink-900/60 py-1 pr-3 pl-1 text-xs text-ink-300 transition-colors duration-300 hover:border-brand-500/40 hover:text-ink-100"
            >
              <span className="rounded-full bg-brand-500/15 px-2 py-0.5 font-medium text-brand-200">
                New
              </span>
              AI code intelligence for engineering teams
              <span
                className="text-ink-500 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden
              >
                →
              </span>
            </Link>
          </Reveal>

          {/* max-w-5xl, not 4xl: at the lg display size the first line needs
              the extra room or it wraps to three lines. */}
          <h1 className="mt-7 max-w-5xl text-4xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl lg:text-[4rem]">
            {/* Gradients go on `wordClassName`, not `className`: each word is
                transformed, and background-clip:text has to sit on the element
                that moves or the text renders invisible. */}
            <TextReveal
              as="span"
              text="Code review that understands"
              className="block"
              wordClassName="text-display"
            />
            <TextReveal
              as="span"
              text="your entire codebase"
              className="mt-1 block"
              wordClassName="text-brand-display"
              delay={0.28}
            />
          </h1>

          <Reveal delay={0.5} duration={0.8}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              CodeRev reads every pull request in the context of the whole
              repository — surfacing real risk, explaining intent, and giving
              your team the confidence to merge quickly.
            </p>
          </Reveal>

          <Reveal delay={0.62} duration={0.8}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <Magnetic strength={5}>
                <Link
                  href={appRoutes.login}
                  className={cn(buttonVariants({ size: "lg" }), "px-7")}
                >
                  Get started
                  <span aria-hidden>→</span>
                </Link>
              </Magnetic>

              <Link
                href="#how-it-works"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "px-7",
                )}
              >
                See how it works
              </Link>
            </div>
          </Reveal>

          {/* Capability chips, in place of a fake "no credit card" line */}
          <Reveal delay={0.74}>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-subtle-foreground">
              {capabilities.map((capability) => (
                <li key={capability} className="flex items-center gap-1.5">
                  <CheckGlyph />
                  {capability}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Product visualisation */}
        <Reveal
          from="up"
          delay={0.5}
          duration={1}
          scale={0.97}
          className="mt-14 sm:mt-20"
        >
          <Tilt max={3.5} perspective={1400} glare className="rounded-2xl">
            <ReviewConsole />
          </Tilt>
        </Reveal>
      </Container>
    </SpotlightSection>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className="size-3 shrink-0 text-signal-pass"
    >
      <path
        d="M2.5 6.25 4.75 8.5 9.5 3.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
