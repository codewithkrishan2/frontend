import { appRoutes } from "@/lib/api/endpoints";
import { buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Starts the GitHub OAuth flow.
 *
 * A plain anchor, not a fetch, and not a `next/link`. The target chain is
 * redirect-only — this app's Route Handler 307s to the backend, which 302s to
 * GitHub's consent screen — so it needs a real full-page navigation. Fetch would
 * follow the redirects and hand back GitHub's HTML instead of showing it, and
 * client-side routing cannot leave the origin at all.
 *
 * `rel="nofollow"` keeps crawlers out of a flow that mutates state.
 */
export function GitHubSignIn({ className }: { className?: string }) {
  return (
    <a
      href={appRoutes.startGithubSignIn}
      rel="nofollow"
      className={cn(
        buttonVariants({ size: "lg", block: true }),
        "gap-2.5",
        className,
      )}
    >
      <GitHubGlyph />
      Continue with GitHub
    </a>
  );
}

function GitHubGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 shrink-0">
      <path
        d="M8 0C3.58 0 0 3.67 0 8.2c0 3.62 2.29 6.69 5.47 7.77.4.08.55-.18.55-.4v-1.4c-2.23.5-2.7-1.1-2.7-1.1-.36-.95-.89-1.2-.89-1.2-.73-.51.05-.5.05-.5.8.06 1.23.85 1.23.85.72 1.26 1.88.9 2.34.68.07-.53.28-.9.51-1.1-1.78-.21-3.65-.91-3.65-4.06 0-.9.31-1.63.83-2.2-.08-.21-.36-1.05.08-2.19 0 0 .67-.22 2.2.84a7.4 7.4 0 0 1 4 0c1.53-1.06 2.2-.84 2.2-.84.44 1.14.16 1.98.08 2.19.52.57.83 1.3.83 2.2 0 3.16-1.87 3.85-3.66 4.06.29.25.54.74.54 1.5v2.22c0 .22.14.48.55.4A8.21 8.21 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
