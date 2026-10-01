import Link from "next/link";

import { SectionGlow } from "@/components/backdrop/section-glow";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants, Container } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section
      id="get-started"
      className="relative scroll-mt-24 py-20 sm:py-28"
      aria-labelledby="cta-heading"
    >
      <Container width="wide">
        <Reveal scale={0.98} duration={0.9}>
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border border-border-strong",
              "bg-ink-950/70 px-6 py-16 text-center sm:px-12 sm:py-20",
            )}
          >
            <SectionGlow
              tone="brand"
              position="center"
              className="-top-24 opacity-90"
            />

            {/* Fine grid inside the panel, masked towards the centre. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 grid-lines-sm opacity-60"
              style={{
                maskImage:
                  "radial-gradient(ellipse 70% 70% at 50% 50%, #000 10%, transparent 70%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 70% 70% at 50% 50%, #000 10%, transparent 70%)",
              }}
            />

            <div className="relative">
              <h2
                id="cta-heading"
                className="mx-auto max-w-3xl text-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl lg:leading-[1.1]"
              >
                Understand your code.
                <br className="hidden sm:block" /> Improve it. Ship with
                confidence.
              </h2>

              <p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted-foreground">
                Join the CodeRev preview and put whole-repository review in
                front of your team.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Magnetic strength={5}>
                  <Link
                    href={appRoutes.login}
                    className={cn(buttonVariants({ size: "lg" }), "px-8")}
                  >
                    Get started
                    <span aria-hidden>→</span>
                  </Link>
                </Magnetic>

                <Link
                  href="#product"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "px-8",
                  )}
                >
                  Explore CodeRev
                </Link>
              </div>

              <p className="mt-7 text-xs text-ink-600">
                Preview access. No card required while CodeRev is in preview.
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
