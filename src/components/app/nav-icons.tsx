/**
 * Sidebar glyphs.
 *
 * Inline rather than from an icon package, matching the rest of the app — see
 * `components/auth/oauth-sign-in.tsx`. All drawn on a 24-unit grid as 1.5px
 * strokes in `currentColor`, so they inherit the nav item's colour and stay
 * optically consistent with each other at `size-[1.125rem]`.
 */

type IconProps = { className?: string };

function Glyph({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "size-[1.125rem] shrink-0"}
    >
      {children}
    </svg>
  );
}

/** Four panes — the overview. */
export function DashboardIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </Glyph>
  );
}

/** Two interlocking links — a connection between systems. */
export function IntegrationsIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M10 13.5a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2" />
      <path d="M14 10.5a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2" />
    </Glyph>
  );
}

/** A stack of repositories. */
export function RepositoriesIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M5 5.5A2 2 0 0 1 7 3.5h10a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2z" />
      <path d="M5 16.5h13" />
      <path d="M9 7h5" />
    </Glyph>
  );
}

/** A branch merging back — a pull request. */
export function PullRequestsIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="6.5" cy="5.5" r="2.25" />
      <circle cx="6.5" cy="18.5" r="2.25" />
      <circle cx="17.5" cy="18.5" r="2.25" />
      <path d="M6.5 7.75v8.5" />
      <path d="M17.5 16.25V11a3 3 0 0 0-3-3h-3.25" />
      <path d="M13 5.75 11.25 8 13 10.25" />
    </Glyph>
  );
}

/** Sliders, rather than a gear — reads better at this size. */
export function SettingsIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="10" cy="17" r="2" />
    </Glyph>
  );
}

/** Hamburger / close, for the mobile sidebar trigger. */
export function MenuIcon({ open, className }: IconProps & { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className ?? "size-4"}
    >
      <path d={open ? "M4 4l8 8" : "M2.5 5h11"} />
      <path d={open ? "M12 4l-8 8" : "M2.5 11h11"} />
    </svg>
  );
}
