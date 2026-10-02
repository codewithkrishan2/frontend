import type { Metadata } from "next";

import { DeveloperSection } from "@/components/marketing/developer-section";
import { SectionPage } from "@/components/marketing/section-page";

export const metadata: Metadata = {
  title: "For developers",
  description:
    "No new tab to babysit. CodeRev is a command, a check, and a config file your team owns.",
};

export default function DevelopersPage() {
  return (
    <SectionPage>
      <DeveloperSection headingLevel="h1" />
    </SectionPage>
  );
}
