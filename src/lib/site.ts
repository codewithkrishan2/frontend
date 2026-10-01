/**
 * Global brand and navigation configuration.
 *
 * Section-specific copy lives with the section component that renders it;
 * this file holds only what is shared across the shell (nav, footer, metadata).
 */

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

/** Primary nav. Anchors resolve to sections on the landing page. */
export const navItems: readonly NavItem[] = [
  { href: "#product", label: "Product" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#resources", label: "Resources" },
];

export type FooterColumn = {
  title: string;
  links: readonly NavItem[];
};

export const footerColumns: readonly FooterColumn[] = [
  {
    title: "Product",
    links: [
      { href: "#product", label: "Overview" },
      { href: "#features", label: "Features" },
      { href: "#how-it-works", label: "How it works" },
      { href: "#pricing", label: "Pricing" },
      { href: "#developers", label: "For developers" },
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
