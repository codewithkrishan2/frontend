import { buttonVariants } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

type ConnectProviderButtonProps = {
  providerCode: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  className?: string;
};

/**
 * Starts a provider consent flow.
 *
 * A plain anchor for the same reason the sign-in buttons are: the chain ends at
 * the provider's consent screen, an interactive page on another origin. This
 * app's Route Handler fetches the authorization URL — which needs the access
 * token from an httpOnly cookie — then 307s the browser onward. `next/link`
 * cannot leave the origin and `fetch` would hand back the consent page's HTML
 * instead of showing it.
 *
 * `rel="nofollow"` keeps crawlers out of a flow that mutates state.
 */
export function ConnectProviderButton({
  providerCode,
  label = "Connect",
  variant = "primary",
  size = "md",
  block = false,
  className,
}: ConnectProviderButtonProps) {
  return (
    <a
      href={appRoutes.startScmConnect(providerCode)}
      rel="nofollow"
      className={cn(
        buttonVariants({
          variant,
          size,
          ...(block ? { block: true } : {}),
        }),
        className,
      )}
    >
      {label}
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5"
      >
        <path d="M6 3.5 10.5 8 6 12.5" />
      </svg>
    </a>
  );
}

export type { ConnectProviderButtonProps };
