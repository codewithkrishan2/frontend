import { Counter } from "@/components/motion/counter";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Container } from "@/components/ui";

/**
 * Illustrative outcome figures.
 *
 * Explicitly framed as modelled targets rather than measured customer results,
 * since CodeRev has not launched.
 */
const metrics = [
  {
    value: 64,
    suffix: "%",
    label: "Less time in review",
    detail: "Modelled against a 3-day median review cycle",
  },
  {
    value: 3.2,
    decimals: 1,
    suffix: "x",
    label: "More issues caught pre-merge",
    detail: "Compared with lint and unit tests alone",
  },
  {
    value: 1284,
    label: "Files indexed per repository",
    detail: "Median for the repositories used in testing",
  },
  {
    value: 1.8,
    decimals: 1,
    suffix: "s",
    label: "Median analysis time",
    detail: "Per pull request on a warm index",
  },
] as const;

export function Metrics() {
  return (
    <section
      className="relative py-20 sm:py-24"
      aria-labelledby="metrics-heading"
    >
      <Container width="wide">
        <Reveal>
          <h2
            id="metrics-heading"
            className="text-center font-mono text-xs tracking-[0.18em] text-subtle-foreground uppercase"
          >
            What good review should cost you
          </h2>
        </Reveal>

        <Stagger
          as="dl"
          gap={0.09}
          className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4"
        >
          {metrics.map((metric) => (
            <StaggerItem key={metric.label} className="text-center">
              <dd className="text-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                <Counter
                  value={metric.value}
                  decimals={"decimals" in metric ? metric.decimals : 0}
                  suffix={"suffix" in metric ? metric.suffix : undefined}
                />
              </dd>
              <dt className="mt-3">
                <span className="block text-sm font-medium text-ink-100">
                  {metric.label}
                </span>
                <span className="mt-1 block text-xs text-subtle-foreground">
                  {metric.detail}
                </span>
              </dt>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.15}>
          <p className="mt-12 text-center text-xs text-ink-600">
            Illustrative figures modelled during development. Not measured
            customer results.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
