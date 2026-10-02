/**
 * Global brand and navigation configuration.
 *
 * Section-specific copy lives with the section component that renders it;
 * this file holds only what is shared across the shell (nav, footer, metadata).
 *
 * Paths come from `appRoutes` rather than being written out again here, so a
 * route rename cannot leave the nav pointing at a 404.
 */

import { appRoutes } from "@/lib/api/endpoints";

export const siteConfig = {
  name: "CodeRev",
  tagline: "AI code intelligence for teams that ship",
  description:
    "CodeRev reads your repositories the way a senior engineer does: surfacing risk, explaining intent, and turning every pull request into a faster, safer review.",
} as const;

export type NavItem = {
  href: string;
  label: string;
};

/**
 * Primary nav.
 *
 * These are routes, not in-page anchors. Each one opens a page carrying that
 * section alone and ends there; `/` still presents the full sequence for someone
 * who wants to read straight through.
 *
 * The previous "Resources" item is gone. It pointed at `#resources`, which was an
 * empty `sr-only` span in the footer — the link moved the page nowhere and there
 * is no resources content to route to yet. Restore it here once there is
 * something to show.
 */
export const navItems: readonly NavItem[] = [
  { href: appRoutes.product, label: "Product" },
  { href: appRoutes.features, label: "Features" },
  { href: appRoutes.howItWorks, label: "How it works" },
  { href: appRoutes.pricing, label: "Pricing" },
];

export type FooterColumn = {
  title: string;
  links: readonly NavItem[];
};

/**
 * Footer columns.
 *
 * The Product column points at real routes. The other three still point at
 * `sr-only` anchor spans in the footer itself: there is no documentation, company
 * or legal content yet, and inventing pages for fifteen links would mean
 * inventing the content too. They resolve the same way on every page, so nothing
 * regressed when the sections gained routes — but they are placeholders, and
 * should become routes as the content is written.
 */
export const footerColumns: readonly FooterColumn[] = [
  {
    title: "Product",
    links: [
      { href: appRoutes.product, label: "Overview" },
      { href: appRoutes.features, label: "Features" },
      { href: appRoutes.howItWorks, label: "How it works" },
      { href: appRoutes.pricing, label: "Pricing" },
      { href: appRoutes.developers, label: "For developers" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "#resources", label: "Documentation" },
      { href: "#resources", label: "API reference" },
      { href: "#resources", label: "Changelog" },
      { href: "#resources", label: "Guides" },
      { href: "#resources", label: "Status" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#company", label: "About" },
      { href: "#company", label: "Careers" },
      { href: "#company", label: "Blog" },
      { href: "#company", label: "Customers" },
      { href: "#company", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "#legal", label: "Privacy" },
      { href: "#legal", label: "Terms" },
      { href: "#legal", label: "Security" },
      { href: "#legal", label: "DPA" },
      { href: "#legal", label: "Subprocessors" },
    ],
  },
];

export type SocialLink = {
  href: string;
  label: string;
  icon: "github" | "x" | "linkedin" | "discord";
};

export const socialLinks: readonly SocialLink[] = [
  { href: "#github", label: "CodeRev on GitHub", icon: "github" },
  { href: "#x", label: "CodeRev on X", icon: "x" },
  { href: "#linkedin", label: "CodeRev on LinkedIn", icon: "linkedin" },
  { href: "#discord", label: "CodeRev community on Discord", icon: "discord" },
];
