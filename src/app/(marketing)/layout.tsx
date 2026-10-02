import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

/**
 * Shell shared by the landing page and each section route.
 *
 * A route group, so the folder name adds nothing to the URL: the page inside it
 * is still `/`. It exists to keep the nav and footer mounted once for every
 * marketing page while leaving `/login`, `/dashboard` and the OAuth routes — which
 * sit outside the group — with their own self-contained shells.
 *
 * `<main>` belongs to the pages rather than to this layout, because the landing
 * page and the section pages need different top spacing: the hero draws its own
 * clearance under the fixed header, a bare section does not.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}
