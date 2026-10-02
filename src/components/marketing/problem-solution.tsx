import { SectionGlow } from "@/components/backdrop/section-glow";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Card, Container } from "@/components/ui";
import { cn } from "@/lib/utils";

const problems = [
  {
    title: "Review queues stall delivery",
    body: "Pull requests wait on whoever happens to know that corner of the codebase. Context lives in people, not tooling.",
  },
  {
    title: "Linters miss what matters",
    body: "Static rules catch formatting and obvious smells. They cannot tell you that a change quietly breaks an auth boundary.",
  },
  {
    title: "Risk is invisible until production",
    body: "Nothing surfaces which changes touch sensitive paths, so the risky diff and the typo fix look identical in the queue.",
  },
];

const solutions = [
  {
    title: "Whole-repository context",
    body: "CodeRev builds an understanding of how modules, contracts and call paths relate, so a diff is read against the system it lands in.",
  },
  {
    title: "Explanations, not just flags",
    body: "Each finding states what changed, why it is a problem, and which path to take — in language a reviewer can act on.",
  },
  {
    title: "Risk ranked before merge",
    body: "Changes are ordered by blast radius, so reviewer attention goes where a mistake would actually cost something.",
  },
];

/**
 * The first argument the page makes after the hero, and the one place on the
 * landing page that carries a scroll-linked depth effect.
 *
 * The parallax is the section's argument rather than decoration. Three layers
 * cross the viewport at different rates — the glow slowest, "Today" slower than
 * the page, "With CodeRev" faster — so the two columns visibly pull apart as you
 * scroll and the CodeRev side arrives first. Scrolling performs the comparison
 * the copy is making.
 *
 * Deliberately not repeated on the sections below: a drift applied to everything
 * stops reading as depth and becomes noise. `LogoCloud`, directly above, is left
 * alone for the same reason — it already carries a horizontal marquee, and a
 * second axis of motion there would fight it.
 */
export function ProblemSolution() {
  return (
    <section
      id="why-coderev"
      className="relative scroll-mt-24 py-20 sm:py-28"
      aria-labelledby="why-coderev-heading"
    >
      {/* Deepest layer. The absolute, clipped wrapper has to stay on the outside:
          the glow is wider than the viewport on purpose, and an unclipped drifting
          copy of it would widen the document and raise a horizontal scrollbar. */}
      <Parallax
        layer="lag"
        distance={56}
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <SectionGlow tone="accent" position="right" className="top-32" />
      </Parallax>

      <Container width="wide">
        <SectionHeading
          eyebrow="The problem"
          title={
            <span id="why-coderev-heading">
              Review is where engineering velocity goes to die
            </span>
          }
          description="Every team feels it. The bottleneck is not writing code, it is building enough confidence to merge it."
        />

        {/* `items-start` so each column is sized by its own content: the columns
            now drift independently, and stretching them to a shared row height
            would leave the trailing one visibly short of its own box. */}
        <div className="mt-14 grid items-start gap-8 lg:mt-16 lg:grid-cols-2 lg:gap-10">
          {/* Problem column — lags the page, so it sits behind the solution. */}
          <Parallax layer="lag" distance={24}>
            <Stagger className="flex flex-col gap-4">
              <StaggerItem>
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-0.5 rounded-full bg-signal-fail/60" />
                  <h3 className="font-mono text-xs tracking-[0.16em] text-ink-300 uppercase">
                    Today
                  </h3>
                </div>
              </StaggerItem>

              {problems.map((item) => (
                <StaggerItem key={item.title}>
                  <Card
                    tone="flat"
                    className="h-full border-signal-fail/12"
                    padding="md"
                  >
                    <p className="text-[0.9375rem] font-medium text-ink-100">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          </Parallax>

          {/* Solution column — leads the page, arriving ahead of the problem. */}
          <Parallax layer="lead" distance={24}>
            <Stagger className="flex flex-col gap-4" delay={0.15}>
              <StaggerItem>
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-0.5 rounded-full bg-signal-pass/70" />
                  <h3 className="font-mono text-xs tracking-[0.16em] text-brand-200 uppercase">
                    With CodeRev
                  </h3>
                </div>
              </StaggerItem>

              {solutions.map((item, index) => (
                <StaggerItem key={item.title}>
                  <Card
                    tone="raised"
                    interactive
                    padding="md"
                    className={cn(
                      "h-full",
                      "edge-highlight",
                      index === 0 && "border-brand-500/25",
                    )}
                  >
                    <p className="text-[0.9375rem] font-medium text-ink-50">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          </Parallax>
        </div>

        <Reveal delay={0.2} className="mt-10">
          <p className="text-center text-xs text-ink-600">
            Capability descriptions reflect the CodeRev product direction for
            this release cycle.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
