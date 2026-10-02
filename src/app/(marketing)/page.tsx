import { DeveloperSection } from "@/components/marketing/developer-section";
import { Features } from "@/components/marketing/features";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { Metrics } from "@/components/marketing/metrics";
import { Pricing } from "@/components/marketing/pricing";
import { ProblemSolution } from "@/components/marketing/problem-solution";
import { ProductShowcase } from "@/components/marketing/product-showcase";

/**
 * The full story, in order, for someone who wants to read straight through.
 *
 * Every section here is also reachable as its own route. This page keeps all of
 * them: arriving at `/` should still show everything, and the section routes are
 * a way to jump to one part without the rest, not a replacement for this.
 *
 * Headings stay at their default `h2` because `Hero` owns the `h1`.
 */
export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <LogoCloud />
      <ProblemSolution />
      <Features />
      <ProductShowcase />
      <HowItWorks />
      <DeveloperSection />
      <Metrics />
      <Pricing />
      <FinalCta />
    </main>
  );
}
