import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Container, Separator } from "@/components/ui";
import { footerColumns, siteConfig, socialLinks } from "@/lib/site";

const socialPaths: Record<string, string> = {
  github:
    "M8 0C3.58 0 0 3.67 0 8.2c0 3.62 2.29 6.69 5.47 7.77.4.08.55-.18.55-.4v-1.4c-2.23.5-2.7-1.1-2.7-1.1-.36-.95-.89-1.2-.89-1.2-.73-.51.05-.5.05-.5.8.06 1.23.85 1.23.85.72 1.26 1.88.9 2.34.68.07-.53.28-.9.51-1.1-1.78-.21-3.65-.91-3.65-4.06 0-.9.31-1.63.83-2.2-.08-.21-.36-1.05.08-2.19 0 0 .67-.22 2.2.84a7.4 7.4 0 0 1 4 0c1.53-1.06 2.2-.84 2.2-.84.44 1.14.16 1.98.08 2.19.52.57.83 1.3.83 2.2 0 3.16-1.87 3.85-3.66 4.06.29.25.54.74.54 1.5v2.22c0 .22.14.48.55.4A8.21 8.21 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z",
  x: "M12.6 1.5h2.45l-5.36 6.13L16 14.5h-4.9l-3.2-4.2-3.67 4.2H1.78l5.55-6.35L1 1.5h5.02l3 3.96L12.6 1.5Zm-.86 11.54h1.36L4.32 2.89H2.86l8.88 10.15Z",
  linkedin:
    "M3.4 5.3H.6V15h2.8V5.3ZM2 1a1.63 1.63 0 1 0 0 3.26A1.63 1.63 0 0 0 2 1Zm7.6 4.08c-1.36 0-2.1.73-2.44 1.24V5.3H5.2V15H8v-5.4c0-1.14.6-1.7 1.44-1.7.84 0 1.36.56 1.36 1.7V15h2.8V9.3c0-2.6-1.4-4.22-3.4-4.22Z",
  discord:
    "M13.55 3.07A12.3 12.3 0 0 0 10.5 2.1l-.2.42a9.2 9.2 0 0 1 2.65 1.32 9.6 9.6 0 0 0-9.9 0A9.2 9.2 0 0 1 5.7 2.52L5.5 2.1a12.3 12.3 0 0 0-3.05.97C.6 6.12-.1 9.32.2 12.5a12.2 12.2 0 0 0 3.7 1.86l.5-.85c-.6-.22-1.16-.5-1.68-.83l.34-.26a8.7 8.7 0 0 0 7.88 0l.34.26c-.52.33-1.08.6-1.68.83l.5.85a12.2 12.2 0 0 0 3.7-1.86c.34-3.35-.44-6.52-2.25-9.43ZM5.55 10.4c-.72 0-1.3-.66-1.3-1.47 0-.8.57-1.47 1.3-1.47.73 0 1.31.67 1.3 1.47 0 .81-.57 1.47-1.3 1.47Zm4.9 0c-.72 0-1.3-.66-1.3-1.47 0-.8.57-1.47 1.3-1.47.73 0 1.31.67 1.3 1.47 0 .81-.57 1.47-1.3 1.47Z",
};

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/8">
      {/* Anchor targets for the nav's Resources link and footer columns. */}
      <span id="resources" className="sr-only" />
      <span id="company" className="sr-only" />
      <span id="legal" className="sr-only" />

      <Container width="wide" className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2.6fr] lg:gap-16">
          {/* Brand block */}
          <div>
            <Link href="/" aria-label="CodeRev home" className="inline-flex">
              <Logo />
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {siteConfig.description}
            </p>

            <ul className="mt-6 flex items-center gap-2">
              {socialLinks.map((social) => (
                <li key={social.icon}>
                  <Link
                    href={social.href}
                    aria-label={social.label}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-ink-400 transition-colors duration-200 hover:border-border-strong hover:text-ink-100"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
                      <path d={socialPaths[social.icon]} fill="currentColor" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-sm font-medium text-ink-100">
                    {column.title}
                  </h3>

                  <ul className="mt-4 flex flex-col gap-2.5">
                    {column.links.map((link) => (
                      <li key={`${column.title}-${link.label}`}>
                        <Link
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors duration-200 hover:text-ink-100"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>

        <Separator soft className="mt-12" />

        <div className="mt-6 flex flex-col gap-3 text-xs text-subtle-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>

          <p className="flex items-center gap-2">
            <span
              className="size-1.5 rounded-full bg-signal-pass"
              aria-hidden
            />
            Preview build — marketing site
          </p>
        </div>
      </Container>
    </footer>
  );
}
