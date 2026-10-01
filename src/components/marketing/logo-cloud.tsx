import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui";

/**
 * Integration strip.
 *
 * Wordmarks rather than brand logos: reproducing third-party marks from memory
 * gets them subtly wrong, and a consistent type treatment reads cleaner anyway.
 */
const integrations = [
  "GitHub",
  "GitLab",
  "Bitbucket",
  "VS Code",
  "JetBrains",
  "Jira",
  "Linear",
  "Slack",
  "CircleCI",
  "Vercel",
] as const;

export function LogoCloud() {
  return (
    <section
      className="relative py-12 sm:py-16"
      aria-labelledby="stack-heading"
    >
      <Container width="wide">
        <Reveal>
          <p
            id="stack-heading"
            className="text-center font-mono text-xs tracking-[0.18em] text-subtle-foreground uppercase"
          >
            Designed for the stack your team already runs
          </p>
        </Reveal>

        {/* Marquee. Duplicated once and translated -50%, so the loop is
            seamless. aria-hidden on the copy keeps it out of the a11y tree. */}
        <Reveal delay={0.1} className="mt-8">
          <div className="group relative overflow-hidden edge-fade-x">
            <div className="flex w-max animate-marquee items-center gap-x-12 group-hover:[animation-play-state:paused] sm:gap-x-16">
              {[0, 1].map((copy) => (
                <ul
                  key={copy}
                  aria-hidden={copy === 1}
                  className="flex shrink-0 items-center gap-x-12 sm:gap-x-16"
                >
                  {integrations.map((name) => (
                    <li
                      key={`${copy}-${name}`}
                      className="text-lg font-medium tracking-tight whitespace-nowrap text-ink-400 transition-colors duration-300 hover:text-ink-200 sm:text-xl"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mt-6 text-center text-xs text-ink-600">
            Integration targets for the CodeRev platform. Availability will be
            announced per provider.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
