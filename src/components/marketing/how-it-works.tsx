import { SectionGlow } from "@/components/backdrop/section-glow";
import {
  SectionHeading,
  type RoutableSectionProps,
} from "@/components/marketing/section-heading";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Card, Container } from "@/components/ui";

const steps = [
  {
    step: "01",
    title: "Connect a repository",
    body: "Grant read access to the repositories you want reviewed. CodeRev indexes structure and history without writing to your code.",
  },
  {
    step: "02",
    title: "CodeRev builds context",
    body: "Modules, contracts and call paths are mapped into a model of how the system fits together — the context a new reviewer lacks.",
  },
  {
    step: "03",
    title: "Changes are analyzed",
    body: "Each pull request is read against that model. Findings are ranked by blast radius and explained in plain language.",
  },
  {
    step: "04",
    title: "Your team acts",
    body: "Reviewers open the diff already knowing what matters, with suggested changes anchored to specific lines.",
  },
];

export function HowItWorks({ headingLevel }: RoutableSectionProps = {}) {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 py-20 sm:py-28"
      aria-labelledby="how-heading"
    >
      <SectionGlow tone="brand" position="left" className="top-40" />

      <Container width="wide">
        <SectionHeading
          as={headingLevel}
          eyebrow="How it works"
          title={<span id="how-heading">Four steps, then it runs itself</span>}
          description="Setup is a one-time action. After that, analysis follows your existing pull request flow."
        />

        <Stagger
          as="ol"
          gap={0.1}
          className="relative mt-14 grid list-none gap-5 lg:mt-16 lg:grid-cols-4 lg:gap-4"
        >
          {/* Connector. Drawn behind the cards on desktop only, where the
              steps sit on one row. */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-[3.25rem] right-0 left-0 hidden h-px lg:block"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.48 0.21 277 / 0.5) 12%, oklch(0.63 0.12 200 / 0.5) 88%, transparent)",
            }}
          />

          {steps.map((item) => (
            <StaggerItem as="li" key={item.step} className="relative">
              <Card
                tone="raised"
                interactive
                padding="md"
                className="edge-highlight h-full"
              >
                <div className="flex items-center gap-3">
                  <span className="relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-brand-500/30 bg-ink-950 font-mono text-xs text-brand-300">
                    {item.step}
                  </span>
                  <span className="h-px flex-1 bg-border lg:hidden" />
                </div>

                <h3 className="mt-4 font-medium tracking-tight text-ink-50">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
