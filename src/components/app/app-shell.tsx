"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  DashboardIcon,
  IntegrationsIcon,
  MenuIcon,
  PullRequestsIcon,
  RepositoriesIcon,
  SettingsIcon,
} from "@/components/app/nav-icons";
import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "@/components/brand/logo";
import { Avatar, Badge, Button } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

/**
 * Chrome for every signed-in page.
 *
 * A client component because the sidebar highlights the current route and owns
 * the mobile sheet's open state. `children` arrives already rendered on the
 * server, so making the shell interactive does not pull the pages into the
 * client bundle.
 *
 * It renders the single `<main id="main">` for the authenticated area, which the
 * root layout's skip link targets — pages inside must not declare their own.
 */

type NavItem = {
  label: string;
  href: string;
  icon: (props: { className?: string }) => ReactNode;
  /**
   * Routes that have no page yet. Rendered as disabled rows rather than being
   * hidden, so the shape of the product is visible without pretending the
   * screens exist.
   */
  soon?: boolean;
  /**
   * Overrides the default "current route" test.
   *
   * Needed because two rows share a destination. Repository browsing has no
   * provider-agnostic landing page — a repository is only reachable through a
   * connection, so choosing one is the first step — which means Repositories and
   * Integrations both point at the hub. Prefix matching on `href` alone would
   * then light up both rows at once on every page, putting two
   * `aria-current` elements in the nav and leaving a reader unable to tell where
   * they are.
   */
  activeWhen?: (pathname: string) => boolean;
};

/** True on any repository-browsing route. */
const isRepositoryRoute = (pathname: string) =>
  pathname.includes("/repositories");

const navSections: readonly { heading: string; items: readonly NavItem[] }[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: appRoutes.dashboard, icon: DashboardIcon },
      {
        label: "Integrations",
        href: appRoutes.integrations,
        icon: IntegrationsIcon,
        // Yields to Repositories on the browsing routes, which are nested under
        // `/integrations/` but are a different part of the product.
        activeWhen: (pathname) =>
          (pathname === appRoutes.integrations ||
            pathname.startsWith(`${appRoutes.integrations}/`)) &&
          !isRepositoryRoute(pathname),
      },
    ],
  },
  {
    heading: "Review",
    items: [
      {
        // Points at the hub because that is genuinely the first step: a
        // repository is only reachable through a connection, so the hub's
        // per-account "Browse repositories" is the entry point. It highlights on
        // the browsing routes rather than on the hub itself.
        label: "Repositories",
        href: appRoutes.integrations,
        icon: RepositoriesIcon,
        activeWhen: isRepositoryRoute,
      },
      {
        // Still unbuilt as a destination: pull requests exist only inside a
        // repository, and there is no cross-repository inbox. Labelled rather
        // than hidden, so the product's shape stays visible.
        label: "Pull requests",
        href: appRoutes.integrations,
        icon: PullRequestsIcon,
        soon: true,
      },
      {
        label: "Settings",
        href: appRoutes.integrations,
        icon: SettingsIcon,
        soon: true,
      },
    ],
  },
];

/** The serialisable slice of `UserResponse` the chrome actually needs. */
export type AppShellUser = {
  email: string;
  fullName: string | null;
  profilePicture: string | null;
};

type AppShellProps = {
  /** Null when the profile could not be loaded; the chrome degrades quietly. */
  user: AppShellUser | null;
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock background scroll while the sheet is up, matching SiteNav.
  useEffect(() => {
    if (!menuOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="min-h-dvh">
      {/* Desktop rail. `fixed` rather than a flex column so long pages scroll
          under a stationary sidebar without a nested scroll container. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-ink-950/70 backdrop-blur-xl lg:flex lg:flex-col">
        <SidebarContent pathname={pathname} user={user} />
      </aside>

      {/* The rail is always on screen, so nothing to dismiss — only the sheet
          below passes `onNavigate`. */}

      {/* Top bar.
          Rendered at every breakpoint, not just on mobile, because it owns the
          only sign-out control in the tree. Putting that control in the sidebar
          instead would mean either duplicating it into a mobile header — two
          elements with the same accessible name in the DOM at once — or hiding
          it behind the sheet, where it is unreachable without opening the nav
          first. One always-visible button avoids both. */}
      <header className="sticky top-0 z-40 border-b border-border glass-strong lg:pl-64">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              className="lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="app-sidebar"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MenuIcon open={menuOpen} />
            </Button>

            {/* The rail already carries the wordmark on desktop, so the bar
                shows it only where the rail is gone. */}
            <Link
              href={appRoutes.dashboard}
              aria-label="CodeRev dashboard"
              className="lg:hidden"
            >
              <Logo markClassName="size-[1.75rem]" />
            </Link>
          </div>

          <LogoutButton />
        </div>
      </header>

      {/* Mobile sheet. Unmounted when closed so its links stay out of the tab
          order without needing `inert`. */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink-1000/70 backdrop-blur-sm"
          />

          <div
            id="app-sidebar"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border-strong bg-ink-950 shadow-[0_0_80px_-10px_oklch(0_0_0/0.9)]"
          >
            {/* Dismissed on tap rather than by watching the pathname: closing
                is a consequence of the user's click, so it belongs in the
                handler. An effect reacting to navigation would be a setState
                cascade for something already known at the call site. */}
            <SidebarContent
              pathname={pathname}
              user={user}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <main id="main" className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({
  pathname,
  user,
  onNavigate,
}: {
  pathname: string;
  user: AppShellUser | null;
  /** Called when a link is followed. Only the mobile sheet needs to react. */
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link
          href={appRoutes.dashboard}
          aria-label="CodeRev dashboard"
          onClick={onNavigate}
          className="rounded-md focus-visible:outline-offset-4"
        >
          <Logo markClassName="size-[1.75rem]" />
        </Link>
      </div>

      <nav
        aria-label="Application"
        className="flex-1 overflow-y-auto px-3 py-5"
      >
        {navSections.map((section) => (
          <div key={section.heading} className="mb-6 last:mb-0">
            <p className="px-3 pb-2 text-[0.6875rem] font-medium tracking-wider text-subtle-foreground uppercase">
              {section.heading}
            </p>

            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.label}>
                  <NavRow
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account block only — signing out lives in the top bar, so there is
          exactly one such control however the sidebar is being shown. */}
      {user ? (
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <Avatar
              name={user.fullName ?? user.email}
              src={user.profilePicture ?? undefined}
              size="sm"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-100">
                {user.fullName ?? "Your account"}
              </p>
              <p className="truncate text-xs text-subtle-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function NavRow({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (item.soon) {
    return (
      <span
        aria-disabled
        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-600"
      >
        <Icon />
        <span className="flex-1">{item.label}</span>
        <Badge tone="outline" size="sm">
          Soon
        </Badge>
      </span>
    );
  }

  // Prefix matching by default, so a nested route — `/integrations/GITHUB` —
  // keeps its parent highlighted. Items that share a destination with another
  // row supply their own test; see `activeWhen`.
  const active = item.activeWhen
    ? item.activeWhen(pathname)
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
        active
          ? "bg-brand-500/12 font-medium text-ink-50"
          : "text-ink-300 hover:bg-white/4 hover:text-ink-100",
      )}
    >
      {/* Colour alone is too quiet against the hover state, so the current
          section also carries a rule — same convention as SiteNav. */}
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-400"
        />
      ) : null}

      <Icon
        className={cn("size-[1.125rem] shrink-0", active && "text-brand-300")}
      />
      {item.label}
    </Link>
  );
}
