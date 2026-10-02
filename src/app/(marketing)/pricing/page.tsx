import type { Metadata } from "next";

import { Pricing } from "@/components/marketing/pricing";
import { SectionPage } from "@/components/marketing/section-page";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Priced per developer, not per repo. Indicative pricing for launch — nothing is charged while CodeRev is in preview.",
};

export default function PricingPage() {
  return (
    <SectionPage>
      <Pricing headingLevel="h1" />
    </SectionPage>
  );
}
