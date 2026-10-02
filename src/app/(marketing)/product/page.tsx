import type { Metadata } from "next";

import { ProductShowcase } from "@/components/marketing/product-showcase";
import { SectionPage } from "@/components/marketing/section-page";

export const metadata: Metadata = {
  title: "Product",
  description:
    "A review surface built for depth: signals, explanations and trends in one place, so a reviewer never has to reconstruct context by hand.",
};

export default function ProductPage() {
  return (
    <SectionPage>
      <ProductShowcase headingLevel="h1" />
    </SectionPage>
  );
}
