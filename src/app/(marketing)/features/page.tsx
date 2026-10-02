import type { Metadata } from "next";

import { Features } from "@/components/marketing/features";
import { SectionPage } from "@/components/marketing/section-page";

export const metadata: Metadata = {
  title: "Features",
  description:
    "CodeRev is built around the parts of review that need judgement, not the parts a formatter already solved.",
};

export default function FeaturesPage() {
  return (
    <SectionPage>
      <Features headingLevel="h1" />
    </SectionPage>
  );
}
