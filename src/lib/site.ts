export const siteConfig = {
  name: "Application Services",
  shortName: "AppServices",
  description:
    "Frontend for the Application Services platform, built with Next.js and Tailwind CSS.",
  // Anchors on the home page. Replace with real routes as features land.
  navItems: [
    { href: "#stack", label: "Stack" },
    { href: "#structure", label: "Structure" },
    { href: "#next-steps", label: "Next steps" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
