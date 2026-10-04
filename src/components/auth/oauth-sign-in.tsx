import { ProviderMark } from "@/components/brand/provider-mark";
import {
  oauthProviderList,
  oauthProviders,
  type OAuthProviderId,
} from "@/lib/api/endpoints";
import { buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";

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
      <ProviderMark code={provider} />
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
