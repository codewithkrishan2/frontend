import { ProviderMark } from "@/components/brand/provider-mark";
import { scmProvider } from "@/lib/scm/presentation";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-8 rounded-lg",
  md: "size-11 rounded-xl",
  lg: "size-14 rounded-xl",
} as const;

const markClasses = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

type ProviderTileProps = {
  /** The seeded `providerCode`, e.g. `"GITHUB"`. */
  providerCode: string;
  size?: keyof typeof sizeClasses;
  className?: string;
};

/**
 * A provider's logo in a tinted tile.
 *
 * The per-provider gradient comes from `scmProvider`, so GitHub and Bitbucket
 * are distinguishable at a glance in a list — the marks alone are both
 * monochrome and read as similar at small sizes. Unknown provider codes get a
 * neutral brand tile and the generic mark rather than an empty square.
 */
export function ProviderTile({
  providerCode,
  size = "md",
  className,
}: ProviderTileProps) {
  const { tileClassName } = scmProvider(providerCode);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        sizeClasses[size],
        tileClassName,
        className,
      )}
    >
      <ProviderMark code={providerCode} className={markClasses[size]} />
    </span>
  );
}

export type { ProviderTileProps };
