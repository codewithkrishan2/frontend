import { cn } from "@/lib/utils";

/**
 * Provider logos, inline rather than from an icon package.
 *
 * One source for the artwork because two features need it: the sign-in buttons
 * on `/login`, which key off the lowercase OAuth provider ids, and the SCM
 * integration cards, which key off the uppercase `providerCode` seeded in the
 * database. Lookups are normalised so either spelling resolves to the same mark.
 *
 * `viewBox` is per-provider because the source artwork differs: the GitHub mark
 * is drawn on a 16-unit grid, the Bitbucket mark on 24. Both are single-path and
 * use `currentColor`, so they inherit their container's text colour.
 *
 * Bitbucket path: Simple Icons (CC0 1.0) — https://simpleicons.org
 */
const marks: Record<string, { viewBox: string; path: string }> = {
  github: {
    viewBox: "0 0 16 16",
    path: "M8 0C3.58 0 0 3.67 0 8.2c0 3.62 2.29 6.69 5.47 7.77.4.08.55-.18.55-.4v-1.4c-2.23.5-2.7-1.1-2.7-1.1-.36-.95-.89-1.2-.89-1.2-.73-.51.05-.5.05-.5.8.06 1.23.85 1.23.85.72 1.26 1.88.9 2.34.68.07-.53.28-.9.51-1.1-1.78-.21-3.65-.91-3.65-4.06 0-.9.31-1.63.83-2.2-.08-.21-.36-1.05.08-2.19 0 0 .67-.22 2.2.84a7.4 7.4 0 0 1 4 0c1.53-1.06 2.2-.84 2.2-.84.44 1.14.16 1.98.08 2.19.52.57.83 1.3.83 2.2 0 3.16-1.87 3.85-3.66 4.06.29.25.54.74.54 1.5v2.22c0 .22.14.48.55.4A8.21 8.21 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z",
  },
  bitbucket: {
    viewBox: "0 0 24 24",
    path: "M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z",
  },
};

/**
 * Whether there is real artwork for a provider.
 *
 * Worth asking because providers are database rows seeded from
 * `resources/scm/seed/*.json`: one can be added without a frontend release, in
 * which case `ProviderMark` falls back to a generic glyph.
 */
export function hasProviderMark(code: string): boolean {
  return code.trim().toLowerCase() in marks;
}

type ProviderMarkProps = {
  /** Either an OAuth provider id (`"github"`) or a `providerCode` (`"GITHUB"`). */
  code: string;
  className?: string;
};

export function ProviderMark({ code, className }: ProviderMarkProps) {
  const mark = marks[code.trim().toLowerCase()];

  if (!mark) {
    return <GenericRepositoryMark className={className} />;
  }

  return (
    <svg
      viewBox={mark.viewBox}
      aria-hidden
      className={cn("size-4 shrink-0", className)}
    >
      <path d={mark.path} fill="currentColor" />
    </svg>
  );
}

/**
 * Stand-in for a provider this app has no logo for: a commit node on a branch.
 *
 * Stroked rather than filled, which reads as deliberately generic next to the
 * solid brand marks instead of looking like a broken image.
 */
function GenericRepositoryMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 shrink-0", className)}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v6" />
      <path d="M12 15v6" />
      <path d="M15 12h6" />
    </svg>
  );
}

export type { ProviderMarkProps };
