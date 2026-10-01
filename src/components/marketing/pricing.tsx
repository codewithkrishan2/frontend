import Link from "next/link";

import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Badge, buttonVariants, Container } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Solo",
    price: "Free",
    cadence: "for individual developers",
    description: "Analyse public and personal repositories.",
    features: [
      "3 repositories",
      "Pull request analysis",
      "Security and quality signals",
      "Community support",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Team",
    price: "$24",
    cadence: "per developer / month",
    description: "For teams that review together every day.",
    features: [
      "Unlimited repositories",
      "Repository intelligence graph",
      "Review assistance and drafts",
      "CI checks and SARIF export",
      "Quality trends per team",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "annual agreement",
    description: "For organisations with compliance requirements.",
    features: [
      "Self-hosted or private cloud",
      "SSO and SCIM provisioning",
      "Audit logging and retention control",
      "Dedicated support",
    ],
    cta: "Talk to us",
    featured: false,
  },
] as const;

export function Pricing() {
  return (
    <section
      id="pricing"
      className="relative scroll-mt-24 py-20 sm:py-28"
      aria-labelledby="pricing-heading"
    >
      <Container width="wide">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <span id="pricing-heading">Priced per developer, not per repo</span>
          }
          description="Indicative pricing for launch. Nothing is charged while CodeRev is in preview."
        />

        {/* `isolate` scopes the featured card's negative-z halo to this grid. */}
        <Stagger
          as="ul"
          gap={0.1}
          className="mt-14 grid list-none items-stretch gap-6 lg:mt-20 lg:grid-cols-3 lg:gap-5"
        >
          {tiers.map((tier) => (
            <StaggerItem
              as="li"
              key={tier.name}
              className={cn(
                "isolate h-full",
                // Lift the featured tier instead of relying on colour alone.
                tier.featured && "lg:-mt-4 lg:mb-4",
              )}
            >
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border p-6 sm:p-7",
                  "transition-[transform,border-color] duration-300 ease-out",
                  tier.featured
                    ? [
                        "card-halo border-brand-500/45 bg-ink-900",
                        "shadow-[0_32px_90px_-32px_oklch(0.48_0.21_277/0.55)]",
                      ]
                    : [
                        "border-border bg-ink-950/70",
                        "hover:border-border-strong hover:bg-ink-900/70",
                      ],
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-medium tracking-tight text-ink-50">
                    {tier.name}
                  </h3>
                  {tier.featured ? (
                    <Badge tone="brand" size="sm">
                      Most popular
                    </Badge>
                  ) : null}
                </div>

                {/* Price. Cadence on its own line so the two never run
                    together the way a baseline-aligned pair does. */}
                <div className="mt-6">
                  <span className="block text-[2.5rem] leading-none font-semibold tracking-[-0.03em] text-ink-50">
                    {tier.price}
                  </span>
                  <span className="mt-2 block text-xs text-subtle-foreground">
                    {tier.cadence}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                  {tier.description}
                </p>

                <div
                  className="mt-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  aria-hidden
                />

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-ink-200"
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full",
                          tier.featured
                            ? "bg-brand-500/20 text-brand-200"
                            : "bg-ink-800 text-ink-400",
                        )}
                        aria-hidden
                      >
                        <svg viewBox="0 0 12 12" className="size-2.5">
                          <path
                            d="M2.5 6.25 4.75 8.5 9.5 3.75"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={appRoutes.login}
                  className={cn(
                    buttonVariants({
                      variant: tier.featured ? "primary" : "outline",
                      size: "lg",
                      block: true,
                    }),
                    "mt-8",
                  )}
                >
                  {tier.cta}
                </Link>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.2}>
          <p className="mt-10 text-center text-xs text-ink-600">
            Indicative pricing for the planned launch. Final packaging may
            change.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
