import type { ReactNode } from "react";

import { FinalCta } from "@/components/marketing/final-cta";

/**
 * Wrapper for a route that presents a single landing-page section.
 *
 * Two things every one of them needs:
 *
 * - Clearance under the fixed 64px header. On the landing page the hero supplies
 *   its own `pt-32`; a section dropped straight into a page would start beneath
 *   the header instead. `pt-16` restores the header's height, and the section's
 *   own `py-20 sm:py-28` provides the breathing room on top of it.
 * - An ending. A section followed immediately by the footer reads as a page that
 *   got cut off, and in a Persuade context it also strands the reader with no next
 *   step — so each page closes on the same call to action the landing page uses.
 *
 * `id="main"` matches the skip link in the root layout.
 */
export function SectionPage({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="pt-16">
      {children}
      <FinalCta />
    </main>
  );
}
