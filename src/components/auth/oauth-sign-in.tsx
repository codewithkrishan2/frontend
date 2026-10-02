import {
  oauthProviderList,
  oauthProviders,
  type OAuthProviderId,
} from "@/lib/api/endpoints";
import { buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Provider marks, inline rather than from an icon package.
 *
 * `viewBox` is per-provider because the source artwork differs: the GitHub mark
 * is drawn on a 16-unit grid, the Bitbucket mark on 24. Both are single-path and
 * use `currentColor`, so they inherit the button's text colour.
 *
 * Bitbucket path: Simple Icons (CC0 1.0) — https://simpleicons.org
 */
const glyphs: Record<OAuthProviderId, { viewBox: string; path: string }> = {
  github: {
    viewBox: "0 0 16 16",
    path: "M8 0C3.58 0 0 3.67 0 8.2c0 3.62 2.29 6.69 5.47 7.77.4.08.55-.18.55-.4v-1.4c-2.23.5-2.7-1.1-2.7-1.1-.36-.95-.89-1.2-.89-1.2-.73-.51.05-.5.05-.5.8.06 1.23.85 1.23.85.72 1.26 1.88.9 2.34.68.07-.53.28-.9.51-1.1-1.78-.21-3.65-.91-3.65-4.06 0-.9.31-1.63.83-2.2-.08-.21-.36-1.05.08-2.19 0 0 .67-.22 2.2.84a7.4 7.4 0 0 1 4 0c1.53-1.06 2.2-.84 2.2-.84.44 1.14.16 1.98.08 2.19.52.57.83 1.3.83 2.2 0 3.16-1.87 3.85-3.66 4.06.29.25.54.74.54 1.5v2.22c0 .22.14.48.55.4A8.21 8.21 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z",
  },
  bitbucket: {
    viewBox: "0 0 24 24",
    path: "M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z",
  },
};

type OAuthSignInProps = {
  provider: OAuthProviderId;
  /** Defaults to the filled button. Secondary options read better as outlines. */
  variant?: "primary" | "outline";
  className?: string;
};

/**
 * Starts an OAuth flow for one provider.
 *
 * A plain anchor, not a fetch, and not a `next/link`. The target chain is
 * redirect-only — this app's Route Handler 307s to the backend, which 302s to the
 * provider's consent screen — so it needs a real full-page navigation. Fetch would
 * follow the redirects and hand back the consent page's HTML instead of showing
 * it, and client-side routing cannot leave the origin at all.
 *
 * `rel="nofollow"` keeps crawlers out of a flow that mutates state.
 */
export function OAuthSignIn({
  provider,
  variant = "primary",
  className,
}: OAuthSignInProps) {
  const { label, startSignInRoute } = oauthProviders[provider];
  const glyph = glyphs[provider];

  return (
    <a
      href={startSignInRoute}
      rel="nofollow"
      className={cn(
        buttonVariants({ variant, size: "lg", block: true }),
        "gap-2.5",
        className,
      )}
    >
      <svg viewBox={glyph.viewBox} aria-hidden className="size-4 shrink-0">
        <path d={glyph.path} fill="currentColor" />
      </svg>
      Continue with {label}
    </a>
  );
}

/**
 * Every available provider, in registry order.
 *
 * Rendering from the registry rather than listing buttons by hand is the point:
 * a provider added in `oauthProviders` shows up here automatically. The first is
 * filled to give the group a clear primary action.
 */
export function OAuthSignInOptions({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {oauthProviderList.map((provider, index) => (
        <OAuthSignIn
          key={provider.id}
          provider={provider.id}
          variant={index === 0 ? "primary" : "outline"}
        />
      ))}
    </div>
  );
}
