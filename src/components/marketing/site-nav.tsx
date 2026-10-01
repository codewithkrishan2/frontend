"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Magnetic } from "@/components/motion/magnetic";
import { Button, buttonVariants } from "@/components/ui";
import { useScrolledPast } from "@/hooks/use-scroll-state";
import { appRoutes } from "@/lib/api/endpoints";
import { navItems } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteNav() {
  const scrolled = useScrolledPast(16);
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock background scroll while the mobile sheet is open.
  useEffect(() => {
    if (!menuOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  // Escape closes the sheet, matching the dialog convention.
  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out",
        scrolled
          ? "border-b border-white/8 glass-strong shadow-[0_8px_32px_-16px_oklch(0_0_0/0.8)]"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-5 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="rounded-md focus-visible:outline-offset-4"
          aria-label="CodeRev home"
        >
          <Logo markClassName="size-[1.875rem]" />
        </Link>

        {/* Desktop links */}
        <ul className="ml-4 hidden items-center gap-0.5 lg:flex">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="relative rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-white/4 hover:text-ink-100"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Link
            href={appRoutes.login}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Log in
          </Link>

          <Magnetic strength={4}>
            <Link
              href={appRoutes.login}
              className={cn(buttonVariants({ size: "sm" }), "px-4")}
            >
              Get started
            </Link>
          </Magnetic>
        </div>

        {/* Mobile trigger */}
        <Button
          variant="outline"
          size="icon-sm"
          className="ml-auto lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuGlyph open={menuOpen} />
        </Button>
      </nav>

      {/* Mobile sheet. Rendered always so the open/close transition can run,
          but hidden from assistive tech and pointer events when closed. */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="border-t border-white/8 glass-strong lg:hidden"
      >
        <ul className="flex flex-col gap-1 px-5 py-4 sm:px-6">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-ink-200 transition-colors hover:bg-ink-800/60 hover:text-ink-50"
              >
                {item.label}
              </Link>
            </li>
          ))}

          <li className="mt-3 flex flex-col gap-2 border-t border-white/8 pt-4">
            <Link
              href={appRoutes.login}
              onClick={() => setMenuOpen(false)}
              className={cn(
                buttonVariants({ variant: "outline", block: true }),
              )}
            >
              Log in
            </Link>
            <Link
              href={appRoutes.login}
              onClick={() => setMenuOpen(false)}
              className={cn(buttonVariants({ block: true }))}
            >
              Get started
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}

function MenuGlyph({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
      <path
        d={open ? "M4 4l8 8" : "M2.5 5h11"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="transition-[d] duration-200"
      />
      <path
        d={open ? "M12 4l-8 8" : "M2.5 11h11"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
