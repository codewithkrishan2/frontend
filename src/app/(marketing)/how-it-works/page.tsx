import type { Metadata } from "next";

import { HowItWorks } from "@/components/marketing/how-it-works";
import { SectionPage } from "@/components/marketing/section-page";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Setup is a one-time action. After that, analysis follows your existing pull request flow.",
};

export default function HowItWorksPage() {
  return (
    <SectionPage>
      <HowItWorks headingLevel="h1" />
    </SectionPage>
  );
}
